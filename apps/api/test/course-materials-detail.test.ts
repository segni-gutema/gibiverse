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

const scope = createTestScope("detail")
let academic: SeededAcademicHierarchy
let storageEnv: TempStorageEnv
let uniId: string
let courseId: string
let courseCode: string
const courseName = "Detail Course"

let sessionCookie: string
let studentId: string
let studentName: string
let courseMaterialId: string
const pdfBytes = Buffer.from("%PDF-1.4 detail-preview")
const originalFileName = "CS Midterm 2024.pdf"

before(async () => {
  storageEnv = await createTempStorageEnv("gibiverse-cm-detail-")
  academic = await seedAcademicHierarchy({
    scope,
    universityName: `Detail Uni ${scope.suffix}`,
    departmentName: `Detail Dept ${scope.suffix}`,
    courseName,
    courseCodeTag: "DT",
  })
  uniId = academic.universityId
  courseId = academic.courseId
  courseCode = academic.courseCode

  studentName = "Detail Student"
  const student = await createAuthenticatedStudent({
    scope,
    label: "detail",
    name: studentName,
    password: "DetailPassword123!",
  })
  sessionCookie = student.cookie
  studentId = student.userId

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
  await academic.cleanup()
  await storageEnv.cleanup()
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
