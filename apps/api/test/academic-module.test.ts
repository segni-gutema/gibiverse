import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { courseMaterial } from "../src/db/schema/course-material.js"
import { question } from "../src/db/schema/question.js"
import { user as studentTable } from "../src/db/schema/auth.js"
import { createAcademic } from "../src/modules/academic/index.js"

const suffix = Date.now()
const uniId = `uni_acad_mod_${suffix}`
const otherUniId = `uni_acad_other_${suffix}`
const deptId = `dept_acad_mod_${suffix}`
const otherDeptId = `dept_acad_other_${suffix}`
const courseId = `course_acad_mod_${suffix}`
const otherCourseId = `course_acad_other_${suffix}`
const studentId = `stu_acad_mod_${suffix}`
const materialId = `mat_acad_mod_${suffix}`
const questionId = `q_acad_mod_${suffix}`

const academic = createAcademic({ db })

before(async () => {
  await db.insert(university).values([
    { id: uniId, name: `Academic Mod Uni ${suffix}` },
    { id: otherUniId, name: `Academic Other Uni ${suffix}` },
  ])
  await db.insert(department).values([
    { id: deptId, name: `CS Dept ${suffix}`, universityId: uniId },
    { id: otherDeptId, name: `Math Dept ${suffix}`, universityId: otherUniId },
  ])
  await db.insert(course).values([
    {
      id: courseId,
      name: "Algorithms",
      code: `AL${String(suffix).slice(-4)}`,
      universityId: uniId,
      departmentId: deptId,
    },
    {
      id: otherCourseId,
      name: "Linear Algebra",
      code: `LA${String(suffix).slice(-4)}`,
      universityId: otherUniId,
      departmentId: otherDeptId,
    },
  ])
  await db.insert(studentTable).values({
    id: studentId,
    name: "Academic Student",
    email: `acad_mod_${suffix}@university.edu`,
    emailVerified: true,
  })
  await db.insert(courseMaterial).values({
    id: materialId,
    title: "Algorithm Notes",
    courseMaterialType: "notes",
    academicPeriod: "2026/2027 semester 1",
    filePath: `course-materials/${materialId}/notes.pdf`,
    fileName: "notes.pdf",
    fileSize: 1024,
    mimeType: "application/pdf",
    courseId,
    userId: studentId,
  })
  await db.insert(question).values({
    id: questionId,
    title: "Big-O of Merge Sort?",
    body: "Is it O(n log n)?",
    courseId,
    userId: studentId,
  })
})

after(async () => {
  await db.delete(question).where(eq(question.id, questionId))
  await db.delete(courseMaterial).where(eq(courseMaterial.id, materialId))
  await db.delete(studentTable).where(eq(studentTable.id, studentId))
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(course).where(eq(course.id, otherCourseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(department).where(eq(department.id, otherDeptId))
  await db.delete(university).where(eq(university.id, uniId))
  await db.delete(university).where(eq(university.id, otherUniId))
})

test("listUniversities returns universities ordered by name", async () => {
  const res = await academic.listUniversities()
  assert.equal(res.ok, true)
  if (!res.ok) return
  const ids = res.data.map((u) => u.id)
  assert.ok(ids.includes(uniId))
  assert.ok(ids.includes(otherUniId))
})

test("listDepartments filters by universityId when provided", async () => {
  const res = await academic.listDepartments(uniId)
  assert.equal(res.ok, true)
  if (!res.ok) return
  assert.equal(res.data.length, 1)
  assert.equal(res.data[0]?.id, deptId)
})

test("listCourses filters by universityId and departmentId with counts", async () => {
  const res = await academic.listCourses({
    universityId: uniId,
    departmentId: deptId,
  })
  assert.equal(res.ok, true)
  if (!res.ok) return
  assert.equal(res.data.length, 1)
  assert.equal(res.data[0]?.id, courseId)
  assert.equal(res.data[0]?.materialsCount, 1)
  assert.equal(res.data[0]?.questionsCount, 1)
})

test("getCourseDetails returns course summary, materials, and questions", async () => {
  const res = await academic.getCourseDetails(courseId)
  assert.equal(res.ok, true)
  if (!res.ok) return
  assert.equal(res.data.id, courseId)
  assert.equal(res.data.materials.length, 1)
  assert.equal(res.data.materials[0]?.id, materialId)
  assert.equal(res.data.questions.length, 1)
  assert.equal(res.data.questions[0]?.id, questionId)
})

test("getCourseDetails returns not_found for unknown course", async () => {
  const res = await academic.getCourseDetails("non-existent-course-id")
  assert.equal(res.ok, false)
  if (res.ok) return
  assert.equal(res.error.code, "not_found")
})
