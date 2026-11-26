import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { eq } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { course, department, university } from "../src/db/schema/academic.js"

let scopeCounter = 0

export interface TestScope {
  suffix: string
  id: (name: string) => string
  code: (prefix: string) => string
}

export function createTestScope(prefix: string): TestScope {
  scopeCounter += 1
  const suffix = `${Date.now()}_${scopeCounter}`
  const codeDigits = String(Date.now()).slice(-3)
  return {
    suffix,
    id: (name: string) => `${prefix}_${name}_${suffix}`,
    code: (tag: string) => `${tag}${codeDigits}${scopeCounter}`,
  }
}

export interface SeededAcademicHierarchy {
  universityId: string
  departmentId: string
  courseId: string
  courseCode: string
  cleanup: () => Promise<void>
}

export async function seedAcademicHierarchy(options: {
  scope: TestScope
  universityName?: string
  departmentName?: string
  courseName?: string
  courseCodeTag?: string
}): Promise<SeededAcademicHierarchy> {
  const { scope } = options
  const universityId = scope.id("uni")
  const departmentId = scope.id("dept")
  const courseId = scope.id("course")
  const courseCode = scope.code(options.courseCodeTag ?? "TST")

  await db.insert(university).values({
    id: universityId,
    name: options.universityName ?? `Test University ${scope.suffix}`,
  })
  await db.insert(department).values({
    id: departmentId,
    name: options.departmentName ?? `Test Department ${scope.suffix}`,
    universityId,
  })
  await db.insert(course).values({
    id: courseId,
    name: options.courseName ?? "Test Course",
    code: courseCode,
    universityId,
    departmentId,
  })

  return {
    universityId,
    departmentId,
    courseId,
    courseCode,
    cleanup: async () => {
      await db.delete(course).where(eq(course.id, courseId))
      await db.delete(department).where(eq(department.id, departmentId))
      await db.delete(university).where(eq(university.id, universityId))
    },
  }
}

export interface AuthenticatedStudent {
  userId: string
  cookie: string
  email: string
  name: string
}

export async function createAuthenticatedStudent(options: {
  scope: TestScope
  label?: string
  name?: string
  password?: string
}): Promise<AuthenticatedStudent> {
  const label = options.label ?? "student"
  const email = `${label}_${options.scope.suffix}@university.edu`
  const name = options.name ?? `Test Student ${label}`
  const password = options.password ?? "TestPassword123!"

  const signUpRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
  assert.strictEqual(signUpRes.status, 200)
  const setCookie = signUpRes.headers.get("set-cookie")
  assert.ok(setCookie, "Sign-up response should set session cookie")
  const cookie = setCookie.split(";")[0]!

  const sessionRes = await app.request("/api/auth/get-session", {
    headers: { cookie },
  })
  const sessionBody = (await sessionRes.json()) as {
    user?: { id: string }
  }
  assert.ok(sessionBody.user?.id, "Session should include user id")

  return {
    userId: sessionBody.user.id,
    cookie,
    email,
    name,
  }
}

export interface TempStorageEnv {
  storageDir: string
  cleanup: () => Promise<void>
}

export async function createTempStorageEnv(
  prefix = "gibiverse-test-"
): Promise<TempStorageEnv> {
  const storageDir = await mkdtemp(path.join(tmpdir(), prefix))
  const previousStoragePath = process.env.STORAGE_LOCAL_PATH
  const previousStorageProvider = process.env.STORAGE_PROVIDER
  process.env.STORAGE_LOCAL_PATH = storageDir
  process.env.STORAGE_PROVIDER = "local"

  return {
    storageDir,
    cleanup: async () => {
      if (previousStoragePath === undefined) {
        delete process.env.STORAGE_LOCAL_PATH
      } else {
        process.env.STORAGE_LOCAL_PATH = previousStoragePath
      }
      if (previousStorageProvider === undefined) {
        delete process.env.STORAGE_PROVIDER
      } else {
        process.env.STORAGE_PROVIDER = previousStorageProvider
      }
      await rm(storageDir, { recursive: true, force: true })
    },
  }
}
