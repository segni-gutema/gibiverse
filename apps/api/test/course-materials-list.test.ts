import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq, inArray } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { courseMaterial } from "../src/db/schema/course-material.js"
import { user } from "../src/db/schema/auth.js"

const suffix = Date.now()
const uniId = `uni_cmlist_${suffix}`
const deptCsId = `dept_cs_${suffix}`
const deptMathId = `dept_math_${suffix}`
const courseCsId = `course_cs_${suffix}`
const courseMathId = `course_math_${suffix}`
const courseCsCode = `LC${String(suffix).slice(-3)}`
const courseMathCode = `LM${String(suffix).slice(-3)}`
const studentId = `user_cmlist_${suffix}`

const examId = `cm_exam_${suffix}`
const notesId = `cm_notes_${suffix}`
const mathExamId = `cm_math_exam_${suffix}`

type ListedCourseMaterial = {
  id: string
  title: string
  courseMaterialType: string
  academicPeriod: string
  createdAt: string
  courseId: string
  courseCode: string
  courseName: string
  universityId: string
  departmentId: string
}

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `List Uni ${suffix}`,
  })
  await db.insert(department).values([
    {
      id: deptCsId,
      name: `CS ${suffix}`,
      universityId: uniId,
    },
    {
      id: deptMathId,
      name: `Math ${suffix}`,
      universityId: uniId,
    },
  ])
  await db.insert(course).values([
    {
      id: courseCsId,
      name: "Algorithms",
      code: courseCsCode,
      universityId: uniId,
      departmentId: deptCsId,
    },
    {
      id: courseMathId,
      name: "Linear Algebra",
      code: courseMathCode,
      universityId: uniId,
      departmentId: deptMathId,
    },
  ])
  await db.insert(user).values({
    id: studentId,
    name: "List Student",
    email: `cmlist_${suffix}@university.edu`,
    emailVerified: true,
  })

  const fileMeta = {
    userId: studentId,
    filePath: `course-materials/${suffix}/stub.pdf`,
    fileName: "stub.pdf",
    mimeType: "application/pdf",
    fileSize: 128,
  }

  await db.insert(courseMaterial).values([
    {
      id: examId,
      title: "CS Midterm",
      courseId: courseCsId,
      courseMaterialType: "exam",
      academicPeriod: "2024/2025 semester 1",
      ...fileMeta,
    },
    {
      id: notesId,
      title: "CS Lecture Notes",
      courseId: courseCsId,
      courseMaterialType: "notes",
      academicPeriod: "2024/2025 semester 2",
      ...fileMeta,
      filePath: `course-materials/${suffix}/notes.pdf`,
      fileName: "notes.pdf",
    },
    {
      id: mathExamId,
      title: "Math Final",
      courseId: courseMathId,
      courseMaterialType: "exam",
      academicPeriod: "2023/2024 summer",
      ...fileMeta,
      filePath: `course-materials/${suffix}/math.pdf`,
      fileName: "math.pdf",
    },
  ])
})

after(async () => {
  await db
    .delete(courseMaterial)
    .where(inArray(courseMaterial.id, [examId, notesId, mathExamId]))
  await db.delete(user).where(eq(user.id, studentId))
  await db.delete(course).where(inArray(course.id, [courseCsId, courseMathId]))
  await db
    .delete(department)
    .where(inArray(department.id, [deptCsId, deptMathId]))
  await db.delete(university).where(eq(university.id, uniId))
})

test("GET /api/course-materials lists catalog fields for each course material", async () => {
  const res = await app.request("/api/course-materials")
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as ListedCourseMaterial[]
  assert.ok(Array.isArray(body))

  const match = body.find((row) => row.id === examId)
  assert.ok(match, "Seeded exam should appear in listing")
  assert.strictEqual(match.title, "CS Midterm")
  assert.strictEqual(match.courseMaterialType, "exam")
  assert.strictEqual(match.academicPeriod, "2024/2025 semester 1")
  assert.strictEqual(match.courseId, courseCsId)
  assert.strictEqual(match.courseCode, courseCsCode)
  assert.strictEqual(match.courseName, "Algorithms")
  assert.strictEqual(match.universityId, uniId)
  assert.strictEqual(match.departmentId, deptCsId)
  assert.ok(typeof match.createdAt === "string" && match.createdAt.length > 0)
})

test("GET /api/course-materials filters by universityId", async () => {
  const res = await app.request(
    `/api/course-materials?universityId=${encodeURIComponent(uniId)}`
  )
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as ListedCourseMaterial[]
  const ids = body.map((row) => row.id)
  assert.ok(ids.includes(examId))
  assert.ok(ids.includes(notesId))
  assert.ok(ids.includes(mathExamId))
  assert.ok(body.every((row) => row.universityId === uniId))
})

test("GET /api/course-materials filters by courseMaterialType", async () => {
  const res = await app.request(
    "/api/course-materials?courseMaterialType=notes"
  )
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as ListedCourseMaterial[]
  const ids = body.map((row) => row.id)
  assert.ok(ids.includes(notesId))
  assert.ok(!ids.includes(examId))
  assert.ok(!ids.includes(mathExamId))
  assert.ok(body.every((row) => row.courseMaterialType === "notes"))
})

test("GET /api/course-materials filters by departmentId", async () => {
  const res = await app.request(
    `/api/course-materials?departmentId=${encodeURIComponent(deptMathId)}`
  )
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as ListedCourseMaterial[]
  const ids = body.map((row) => row.id)
  assert.ok(ids.includes(mathExamId))
  assert.ok(!ids.includes(examId))
  assert.ok(!ids.includes(notesId))
  assert.ok(body.every((row) => row.departmentId === deptMathId))
})

test("GET /api/course-materials filters by courseId", async () => {
  const res = await app.request(
    `/api/course-materials?courseId=${encodeURIComponent(courseCsId)}`
  )
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as ListedCourseMaterial[]
  const ids = body.map((row) => row.id)
  assert.ok(ids.includes(examId))
  assert.ok(ids.includes(notesId))
  assert.ok(!ids.includes(mathExamId))
  assert.ok(body.every((row) => row.courseId === courseCsId))
})

test("GET /api/course-materials returns empty list when filter combo matches nothing", async () => {
  const res = await app.request(
    `/api/course-materials?courseMaterialType=exam&departmentId=${encodeURIComponent(deptCsId)}&courseId=${encodeURIComponent(courseMathId)}`
  )
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as ListedCourseMaterial[]
  assert.deepStrictEqual(body, [])
})

test("GET /api/course-materials applies courseMaterialType and departmentId together", async () => {
  const res = await app.request(
    `/api/course-materials?courseMaterialType=exam&departmentId=${encodeURIComponent(deptCsId)}`
  )
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as ListedCourseMaterial[]
  const ids = body.map((row) => row.id)
  assert.ok(ids.includes(examId))
  assert.ok(!ids.includes(notesId))
  assert.ok(!ids.includes(mathExamId))
})

test("GET /api/course-materials rejects invalid courseMaterialType", async () => {
  const res = await app.request(
    "/api/course-materials?courseMaterialType=handout"
  )
  assert.strictEqual(res.status, 400)
  const body = (await res.json()) as { error: string }
  assert.match(body.error, /course material type/i)
})
