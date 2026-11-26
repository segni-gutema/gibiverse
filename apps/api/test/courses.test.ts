import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq, inArray } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { courseMaterial } from "../src/db/schema/course-material.js"
import { question } from "../src/db/schema/question.js"
import { user } from "../src/db/schema/auth.js"

const suffix = Date.now()
const userId = `user_t50_${suffix}`
const uniIdA = `uni_t50_a_${suffix}`
const uniIdB = `uni_t50_b_${suffix}`
const deptIdA1 = `dept_t50_a1_${suffix}`
const deptIdA2 = `dept_t50_a2_${suffix}`
const deptIdB1 = `dept_t50_b1_${suffix}`
const courseId1 = `course_t50_1_${suffix}`
const courseId2 = `course_t50_2_${suffix}`
const courseId3 = `course_t50_3_${suffix}`
const courseCode1 = `C1${String(suffix).slice(-4)}`
const courseCode2 = `C2${String(suffix).slice(-4)}`
const courseCode3 = `C3${String(suffix).slice(-4)}`
const matId1 = `mat_t50_1_${suffix}`
const matId2 = `mat_t50_2_${suffix}`
const qId1 = `q_t50_1_${suffix}`
const qId2 = `q_t50_2_${suffix}`
const qId3 = `q_t50_3_${suffix}`
const qId4 = `q_t50_4_${suffix}`

before(async () => {
  // Seed author user
  await db.insert(user).values({
    id: userId,
    name: `Test Author ${suffix}`,
    email: `author_${suffix}@example.edu`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Seed universities
  await db.insert(university).values([
    { id: uniIdA, name: `University A ${suffix}` },
    { id: uniIdB, name: `University B ${suffix}` },
  ])

  // Seed departments
  await db.insert(department).values([
    { id: deptIdA1, name: `Dept A1 ${suffix}`, universityId: uniIdA },
    { id: deptIdA2, name: `Dept A2 ${suffix}`, universityId: uniIdA },
    { id: deptIdB1, name: `Dept B1 ${suffix}`, universityId: uniIdB },
  ])

  // Seed courses
  await db.insert(course).values([
    {
      id: courseId1,
      name: `Algorithms ${suffix}`,
      code: courseCode1,
      universityId: uniIdA,
      departmentId: deptIdA1,
    },
    {
      id: courseId2,
      name: `Databases ${suffix}`,
      code: courseCode2,
      universityId: uniIdA,
      departmentId: deptIdA2,
    },
    {
      id: courseId3,
      name: `Physics ${suffix}`,
      code: courseCode3,
      universityId: uniIdB,
      departmentId: deptIdB1,
    },
  ])

  // Seed course materials for course 1 (2 materials)
  await db.insert(courseMaterial).values([
    {
      id: matId1,
      title: "Lecture Notes 1",
      courseId: courseId1,
      userId,
      courseMaterialType: "notes",
      academicPeriod: "2026/2027 semester 1",
      filePath: "/dummy/path1",
      fileName: "notes1.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
    },
    {
      id: matId2,
      title: "Lecture Slides 2",
      courseId: courseId1,
      userId,
      courseMaterialType: "slides",
      academicPeriod: "2026/2027 semester 1",
      filePath: "/dummy/path2",
      fileName: "slides2.pdf",
      mimeType: "application/pdf",
      fileSize: 2048,
    },
  ])

  // Seed questions: 1 for course 1, 3 for course 2, 0 for course 3
  await db.insert(question).values([
    {
      id: qId1,
      title: "How does binary search work?",
      body: "Explanation needed for asymptotic complexity.",
      courseId: courseId1,
      userId,
    },
    {
      id: qId2,
      title: "What is B-tree indexing?",
      body: "Details about database index structures.",
      courseId: courseId2,
      userId,
    },
    {
      id: qId3,
      title: "What is 3NF normalization?",
      body: "Third normal form questions.",
      courseId: courseId2,
      userId,
    },
    {
      id: qId4,
      title: "What is ACID consistency?",
      body: "Isolation levels and locks.",
      courseId: courseId2,
      userId,
    },
  ])
})

after(async () => {
  await db
    .delete(question)
    .where(inArray(question.id, [qId1, qId2, qId3, qId4]))
  await db
    .delete(courseMaterial)
    .where(inArray(courseMaterial.id, [matId1, matId2]))
  await db
    .delete(course)
    .where(inArray(course.id, [courseId1, courseId2, courseId3]))
  await db
    .delete(department)
    .where(inArray(department.id, [deptIdA1, deptIdA2, deptIdB1]))
  await db.delete(university).where(inArray(university.id, [uniIdA, uniIdB]))
  await db.delete(user).where(eq(user.id, userId))
})

type CourseCatalogResponseItem = {
  id: string
  name: string
  code: string
  universityId: string
  universityName: string
  departmentId: string
  departmentName: string
  materialsCount: number
  questionsCount: number
}

test("GET /api/courses returns course catalog items with joined names and aggregated counts", async () => {
  const res = await app.request("/api/courses")
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as CourseCatalogResponseItem[]
  assert.ok(Array.isArray(body))

  const item1 = body.find((c) => c.id === courseId1)
  assert.ok(item1, "Course 1 should appear in catalog")
  assert.strictEqual(item1.name, `Algorithms ${suffix}`)
  assert.strictEqual(item1.code, courseCode1)
  assert.strictEqual(item1.universityId, uniIdA)
  assert.strictEqual(item1.universityName, `University A ${suffix}`)
  assert.strictEqual(item1.departmentId, deptIdA1)
  assert.strictEqual(item1.departmentName, `Dept A1 ${suffix}`)
  assert.strictEqual(typeof item1.materialsCount, "number")
  assert.strictEqual(item1.materialsCount, 2)
  assert.strictEqual(typeof item1.questionsCount, "number")
  assert.strictEqual(item1.questionsCount, 1)

  const item2 = body.find((c) => c.id === courseId2)
  assert.ok(item2, "Course 2 should appear in catalog")
  assert.strictEqual(item2.universityName, `University A ${suffix}`)
  assert.strictEqual(item2.departmentName, `Dept A2 ${suffix}`)
  assert.strictEqual(typeof item2.materialsCount, "number")
  assert.strictEqual(item2.materialsCount, 0)
  assert.strictEqual(typeof item2.questionsCount, "number")
  assert.strictEqual(item2.questionsCount, 3)

  const item3 = body.find((c) => c.id === courseId3)
  assert.ok(item3, "Course 3 should appear in catalog with 0 counts")
  assert.strictEqual(item3.universityName, `University B ${suffix}`)
  assert.strictEqual(item3.departmentName, `Dept B1 ${suffix}`)
  assert.strictEqual(typeof item3.materialsCount, "number")
  assert.strictEqual(item3.materialsCount, 0)
  assert.strictEqual(typeof item3.questionsCount, "number")
  assert.strictEqual(item3.questionsCount, 0)
})

test("GET /api/courses?universityId=... filters courses by university", async () => {
  const res = await app.request(`/api/courses?universityId=${uniIdA}`)
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as CourseCatalogResponseItem[]

  assert.ok(body.some((c) => c.id === courseId1))
  assert.ok(body.some((c) => c.id === courseId2))
  assert.ok(!body.some((c) => c.id === courseId3))
  assert.ok(body.every((c) => c.universityId === uniIdA))
})

test("GET /api/courses?departmentId=... filters courses by department", async () => {
  const res = await app.request(`/api/courses?departmentId=${deptIdA1}`)
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as CourseCatalogResponseItem[]

  assert.ok(body.some((c) => c.id === courseId1))
  assert.ok(!body.some((c) => c.id === courseId2))
  assert.ok(!body.some((c) => c.id === courseId3))
  assert.ok(body.every((c) => c.departmentId === deptIdA1))
})

test("GET /api/courses?universityId=...&departmentId=... filters by both", async () => {
  const res = await app.request(
    `/api/courses?universityId=${uniIdA}&departmentId=${deptIdA2}`
  )
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as CourseCatalogResponseItem[]

  assert.ok(body.some((c) => c.id === courseId2))
  assert.ok(!body.some((c) => c.id === courseId1))
  assert.ok(!body.some((c) => c.id === courseId3))
  assert.ok(
    body.every((c) => c.universityId === uniIdA && c.departmentId === deptIdA2)
  )
})

test("GET /api/courses/:id returns 404 for non-existent course", async () => {
  const res = await app.request(`/api/courses/non_existent_course_123`)
  assert.strictEqual(res.status, 404)
  const body = (await res.json()) as { error: string }
  assert.ok(body.error)
})

test("GET /api/courses/:id returns course details with scoped materials and questions", async () => {
  const res = await app.request(`/api/courses/${courseId1}`)
  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as {
    id: string
    name: string
    code: string
    universityId: string
    universityName: string
    departmentId: string
    departmentName: string
    materialsCount: number
    questionsCount: number
    materials: Array<{ id: string; title: string; courseMaterialType: string }>
    questions: Array<{ id: string; title: string; voteScore: number }>
  }

  assert.strictEqual(body.id, courseId1)
  assert.strictEqual(body.code, courseCode1)
  assert.strictEqual(body.universityName, `University A ${suffix}`)
  assert.strictEqual(body.departmentName, `Dept A1 ${suffix}`)
  assert.strictEqual(body.materialsCount, 2)
  assert.strictEqual(body.questionsCount, 1)

  assert.ok(Array.isArray(body.materials))
  assert.strictEqual(body.materials.length, 2)
  assert.ok(body.materials.some((m) => m.id === matId1))
  assert.ok(body.materials.some((m) => m.id === matId2))

  assert.ok(Array.isArray(body.questions))
  assert.strictEqual(body.questions.length, 1)
  assert.strictEqual(body.questions[0]?.id, qId1)
})
