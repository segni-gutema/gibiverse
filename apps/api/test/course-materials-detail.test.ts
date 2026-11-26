import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { eq } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { courseMaterial } from "../src/db/schema/course-material.js"

const suffix = Date.now()
const uniId = `uni_detail_${suffix}`
const deptId = `dept_detail_${suffix}`
const courseId = `course_detail_${suffix}`
const courseCode = `DT${String(suffix).slice(-3)}`
const courseName = "Detail Course"

let storageDir: string
let previousStoragePath: string | undefined
let previousStorageProvider: string | undefined
let sessionCookie: string
let studentId: string
let studentName: string
let courseMaterialId: string
const pdfBytes = Buffer.from("%PDF-1.4 detail-preview")
const originalFileName = "CS Midterm 2024.pdf"

before(async () => {
  storageDir = await mkdtemp(path.join(tmpdir(), "gibiverse-cm-detail-"))
  previousStoragePath = process.env.STORAGE_LOCAL_PATH
  previousStorageProvider = process.env.STORAGE_PROVIDER
  process.env.STORAGE_LOCAL_PATH = storageDir
  process.env.STORAGE_PROVIDER = "local"

  await db.insert(university).values({
    id: uniId,
    name: `Detail Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `Detail Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values({
    id: courseId,
    name: courseName,
    code: courseCode,
    universityId: uniId,
    departmentId: deptId,
  })

  studentName = "Detail Student"
  const email = `detail_${suffix}@university.edu`
  const password = "DetailPassword123!"
  const signUpRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: studentName,
      email,
      password,
    }),
  })
  assert.strictEqual(signUpRes.status, 200)
  const setCookie = signUpRes.headers.get("set-cookie")
  assert.ok(setCookie)
  sessionCookie = setCookie.split(";")[0]!

  const sessionRes = await app.request("/api/auth/get-session", {
    headers: { cookie: sessionCookie },
  })
  const sessionBody = (await sessionRes.json()) as {
    user?: { id: string }
  }
  assert.ok(sessionBody.user?.id)
  studentId = sessionBody.user.id

  const form = new FormData()
  form.set("title", "CS Midterm 2024")
  form.set("courseId", courseId)
  form.set("courseMaterialType", "exam")
  form.set("academicPeriod", "2024/2025 semester 1")
  form.set(
    "file",
    new File([pdfBytes], originalFileName, {
      type: "application/pdf",
    })
  )

  const createRes = await app.request("/api/course-materials", {
    method: "POST",
    headers: { cookie: sessionCookie },
    body: form,
  })
  assert.strictEqual(createRes.status, 201)
  const created = (await createRes.json()) as { id: string }
  courseMaterialId = created.id
})

after(async () => {
  if (courseMaterialId) {
    await db
      .delete(courseMaterial)
      .where(eq(courseMaterial.id, courseMaterialId))
  }
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))

  if (previousStoragePath === undefined) delete process.env.STORAGE_LOCAL_PATH
  else process.env.STORAGE_LOCAL_PATH = previousStoragePath
  if (previousStorageProvider === undefined) delete process.env.STORAGE_PROVIDER
  else process.env.STORAGE_PROVIDER = previousStorageProvider

  await rm(storageDir, { recursive: true, force: true })
})

test("GET /api/course-materials/:id returns course material detail metadata", async () => {
  const res = await app.request(`/api/course-materials/${courseMaterialId}`)
  assert.strictEqual(res.status, 200)

  const body = (await res.json()) as {
    id: string
    title: string
    courseMaterialType: string
    academicPeriod: string
    fileName: string
    mimeType: string
    fileSize: number
    createdAt: string
    courseId: string
    courseCode: string
    courseName: string
    universityId: string
    studentId: string
    studentName: string
  }

  assert.strictEqual(body.id, courseMaterialId)
  assert.strictEqual(body.title, "CS Midterm 2024")
  assert.strictEqual(body.courseMaterialType, "exam")
  assert.strictEqual(body.academicPeriod, "2024/2025 semester 1")
  assert.strictEqual(body.fileName, originalFileName)
  assert.strictEqual(body.mimeType, "application/pdf")
  assert.ok(body.fileSize > 0)
  assert.ok(body.createdAt)
  assert.strictEqual(body.courseId, courseId)
  assert.strictEqual(body.courseCode, courseCode)
  assert.strictEqual(body.courseName, courseName)
  assert.strictEqual(body.universityId, uniId)
  assert.strictEqual(body.studentId, studentId)
  assert.strictEqual(body.studentName, studentName)
})

test("GET /api/course-materials/:id returns 404 for unknown course material", async () => {
  const res = await app.request("/api/course-materials/does-not-exist")
  assert.strictEqual(res.status, 404)
  const body = (await res.json()) as { error: string }
  assert.match(body.error, /not found/i)
})

test("GET /api/course-materials/:id/download streams attachment with original filename", async () => {
  const res = await app.request(
    `/api/course-materials/${courseMaterialId}/download`
  )
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.headers.get("content-type"), "application/pdf")
  assert.match(res.headers.get("content-disposition") ?? "", /attachment/i)
  assert.match(
    res.headers.get("content-disposition") ?? "",
    /CS Midterm 2024\.pdf/
  )
  const bytes = Buffer.from(await res.arrayBuffer())
  assert.deepEqual(bytes, pdfBytes)
})

test("GET /api/course-materials/:id/preview streams inline with matching MIME type", async () => {
  const res = await app.request(
    `/api/course-materials/${courseMaterialId}/preview`
  )
  assert.strictEqual(res.status, 200)
  assert.strictEqual(res.headers.get("content-type"), "application/pdf")
  assert.match(res.headers.get("content-disposition") ?? "", /inline/i)
  const bytes = Buffer.from(await res.arrayBuffer())
  assert.deepEqual(bytes, pdfBytes)
})

test("GET /api/course-materials/:id/download returns 404 for unknown course material", async () => {
  const res = await app.request("/api/course-materials/does-not-exist/download")
  assert.strictEqual(res.status, 404)
  const body = (await res.json()) as { error: string }
  assert.match(body.error, /not found/i)
})

test("GET /api/course-materials/:id/preview returns 404 for unknown course material", async () => {
  const res = await app.request("/api/course-materials/does-not-exist/preview")
  assert.strictEqual(res.status, 404)
  const body = (await res.json()) as { error: string }
  assert.match(body.error, /not found/i)
})
