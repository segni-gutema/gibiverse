import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { courseMaterial } from "../src/db/schema/course-material.js"
import {
  createAuthenticatedStudent,
  createTempStorageEnv,
  createTestScope,
  seedAcademicHierarchy,
  type SeededAcademicHierarchy,
  type TempStorageEnv,
} from "./fixtures.js"

const scope = createTestScope("cm")
let academic: SeededAcademicHierarchy
let storageEnv: TempStorageEnv
let courseId: string
let sessionCookie: string
let studentId: string
const createdMaterialIds: string[] = []

before(async () => {
  storageEnv = await createTempStorageEnv("gibiverse-cm-upload-")
  academic = await seedAcademicHierarchy({
    scope,
    universityName: `Course Material Uni ${scope.suffix}`,
    departmentName: `Course Material Dept ${scope.suffix}`,
    courseName: "Course Material Course",
    courseCodeTag: "CM",
  })
  courseId = academic.courseId

  const student = await createAuthenticatedStudent({
    scope,
    label: "cm",
    name: `Course Material Student ${scope.suffix}`,
    password: "CourseMaterialPassword123!",
  })
  sessionCookie = student.cookie
  studentId = student.userId
})

after(async () => {
  for (const id of createdMaterialIds) {
    await db.delete(courseMaterial).where(eq(courseMaterial.id, id))
  }
  await academic.cleanup()
  await storageEnv.cleanup()
})

test("POST /api/course-materials requires authentication", async () => {
  const form = new FormData()
  form.set("title", "Midterm Exam")
  form.set("courseId", courseId)
  form.set("courseMaterialType", "exam")
  form.set("academicPeriod", "2024/2025 semester 1")
  form.set(
    "file",
    new File([Buffer.from("%PDF-1.4")], "midterm.pdf", {
      type: "application/pdf",
    })
  )

  const res = await app.request("/api/course-materials", {
    method: "POST",
    body: form,
  })
  assert.strictEqual(res.status, 401)
})

test("POST /api/course-materials stores file and creates course material record", async () => {
  const form = new FormData()
  form.set("title", "CS Midterm 2024")
  form.set("courseId", courseId)
  form.set("courseMaterialType", "exam")
  form.set("academicPeriod", "2024/2025 semester 1")
  form.set(
    "file",
    new File([Buffer.from("%PDF-1.4 midterm")], "cs-midterm.pdf", {
      type: "application/pdf",
    })
  )

  const res = await app.request("/api/course-materials", {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: form,
  })
  assert.strictEqual(res.status, 201)
  const body = (await res.json()) as {
    id: string
    title: string
    courseId: string
    userId: string
    courseMaterialType: string
    academicPeriod: string
    fileName: string
    mimeType: string
    fileSize: number
    filePath: string
  }

  createdMaterialIds.push(body.id)
  assert.strictEqual(body.title, "CS Midterm 2024")
  assert.strictEqual(body.courseId, courseId)
  assert.strictEqual(body.userId, studentId)
  assert.strictEqual(body.courseMaterialType, "exam")
  assert.strictEqual(body.academicPeriod, "2024/2025 semester 1")
  assert.strictEqual(body.fileName, "cs-midterm.pdf")
  assert.strictEqual(body.mimeType, "application/pdf")
  assert.ok(body.fileSize > 0)
  assert.ok(body.filePath.startsWith("course-materials/"))

  const [row] = await db
    .select()
    .from(courseMaterial)
    .where(eq(courseMaterial.id, body.id))
  assert.ok(row)
  assert.strictEqual(row.title, "CS Midterm 2024")
  assert.strictEqual(row.userId, studentId)
  assert.strictEqual(row.courseMaterialType, "exam")
  assert.strictEqual(row.academicPeriod, "2024/2025 semester 1")
})

test("POST /api/course-materials rejects invalid files", async () => {
  const form = new FormData()
  form.set("title", "Bad File")
  form.set("courseId", courseId)
  form.set("courseMaterialType", "other")
  form.set("academicPeriod", "2024/2025 semester 2")
  form.set(
    "file",
    new File([Buffer.from("MZ")], "virus.exe", {
      type: "application/x-msdownload",
    })
  )

  const res = await app.request("/api/course-materials", {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: form,
  })
  assert.strictEqual(res.status, 400)
  const body = (await res.json()) as { error: string }
  assert.match(body.error, /unsupported|invalid|format/i)
})

test("POST /api/course-materials validates inputs at route boundary with Zod", async () => {
  // Invalid academic period
  const formPeriod = new FormData()
  formPeriod.set("title", "Period Test")
  formPeriod.set("courseId", courseId)
  formPeriod.set("courseMaterialType", "exam")
  formPeriod.set("academicPeriod", "1990")
  formPeriod.set(
    "file",
    new File([Buffer.from("%PDF-1.4")], "test.pdf", {
      type: "application/pdf",
    })
  )

  const resPeriod = await app.request("/api/course-materials", {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: formPeriod,
  })
  assert.strictEqual(resPeriod.status, 400)
  const bodyPeriod = (await resPeriod.json()) as { error: string }
  assert.match(bodyPeriod.error, /academic period/i)

  // Invalid courseMaterialType
  const formType = new FormData()
  formType.set("title", "Type Test")
  formType.set("courseId", courseId)
  formType.set("courseMaterialType", "handout")
  formType.set("academicPeriod", "2024/2025 semester 1")
  formType.set(
    "file",
    new File([Buffer.from("%PDF-1.4")], "test.pdf", {
      type: "application/pdf",
    })
  )

  const resType = await app.request("/api/course-materials", {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: formType,
  })
  assert.strictEqual(resType.status, 400)
  const bodyType = (await resType.json()) as { error: string }
  assert.match(bodyType.error, /course material type/i)
})

test("GET /api/course-materials validates query parameters at route boundary with Zod", async () => {
  const res = await app.request(
    "/api/course-materials?courseMaterialType=invalid_type"
  )
  assert.strictEqual(res.status, 400)
  const body = (await res.json()) as { error: string }
  assert.match(body.error, /course material type/i)
})
