import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { courseMaterial } from "../src/db/schema/course-material.js"
import { question } from "../src/db/schema/question.js"
import { vote } from "../src/db/schema/vote.js"
import { user as studentTable } from "../src/db/schema/auth.js"
import { createSearch } from "../src/modules/search/index.js"

const suffix = Date.now()
const uniId = `uni_srch_mod_${suffix}`
const deptId = `dept_srch_mod_${suffix}`
const courseId = `course_srch_mod_${suffix}`
const courseCode = `SM${String(suffix).slice(-4)}`
const studentId = `stu_srch_mod_${suffix}`
const materialId = `mat_srch_mod_${suffix}`
const questionId = `q_srch_mod_${suffix}`
const voteId = `v_srch_mod_${suffix}`

const search = createSearch({ db })
const student = { id: studentId, name: "Search Student" }

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `Search Mod Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `Search Mod Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values({
    id: courseId,
    name: `Compilers ${suffix}`,
    code: courseCode,
    universityId: uniId,
    departmentId: deptId,
  })
  await db.insert(studentTable).values({
    id: studentId,
    name: student.name,
    email: `srch_mod_${suffix}@university.edu`,
    emailVerified: true,
  })
  await db.insert(courseMaterial).values({
    id: materialId,
    title: `Lexical Analysis ${suffix}`,
    courseMaterialType: "slides",
    academicPeriod: "2026/2027 semester 1",
    filePath: `course-materials/${materialId}/slides.pdf`,
    fileName: "slides.pdf",
    fileSize: 2048,
    mimeType: "application/pdf",
    courseId,
    userId: studentId,
  })
  await db.insert(question).values({
    id: questionId,
    title: `LR Parser Question ${suffix}`,
    body: "How does shift-reduce parsing work?",
    courseId,
    userId: studentId,
    voteScore: 1,
  })
  await db.insert(vote).values({
    id: voteId,
    userId: studentId,
    targetType: "question",
    targetId: questionId,
    value: 1,
  })
})

after(async () => {
  await db.delete(vote).where(eq(vote.id, voteId))
  await db.delete(question).where(eq(question.id, questionId))
  await db.delete(courseMaterial).where(eq(courseMaterial.id, materialId))
  await db.delete(studentTable).where(eq(studentTable.id, studentId))
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))
})

test("searchMaterials finds matching course materials", async () => {
  const res = await search.searchMaterials({
    query: `Lexical Analysis ${suffix}`,
  })
  assert.equal(res.ok, true)
  if (!res.ok) return
  assert.equal(res.data.length, 1)
  assert.equal(res.data[0]?.id, materialId)
})

test("searchQuestions enriches studentVote for authenticated student and null for guest", async () => {
  const authRes = await search.searchQuestions({
    query: `LR Parser Question ${suffix}`,
    student,
  })
  assert.equal(authRes.ok, true)
  if (!authRes.ok) return
  assert.equal(authRes.data.length, 1)
  assert.equal(authRes.data[0]?.studentVote, 1)

  const guestRes = await search.searchQuestions({
    query: `LR Parser Question ${suffix}`,
    student: null,
  })
  assert.equal(guestRes.ok, true)
  if (!guestRes.ok) return
  assert.equal(guestRes.data.length, 1)
  assert.equal(guestRes.data[0]?.studentVote, null)
})

test("searchCourses returns matching courses with counts", async () => {
  const res = await search.searchCourses({
    query: `Compilers ${suffix}`,
  })
  assert.equal(res.ok, true)
  if (!res.ok) return
  assert.equal(res.data.length, 1)
  assert.equal(res.data[0]?.id, courseId)
  assert.equal(res.data[0]?.materialsCount, 1)
  assert.equal(res.data[0]?.questionsCount, 1)
})

test("searchAll returns empty payload for blank query", async () => {
  const res = await search.searchAll({
    query: "   ",
    type: "all",
    student: null,
  })
  assert.equal(res.ok, true)
  if (!res.ok) return
  assert.deepEqual(res.data.counts, {
    all: 0,
    courseMaterials: 0,
    questions: 0,
    courses: 0,
  })
  assert.equal(res.data.courseMaterials.length, 0)
  assert.equal(res.data.questions.length, 0)
  assert.equal(res.data.courses.length, 0)
})

test("searchAll aggregates counts and previews across all entities", async () => {
  const res = await search.searchAll({
    query: courseCode,
    type: "all",
    student,
  })
  assert.equal(res.ok, true)
  if (!res.ok) return
  assert.equal(res.data.counts.courseMaterials, 1)
  assert.equal(res.data.counts.questions, 1)
  assert.equal(res.data.counts.courses, 1)
  assert.equal(res.data.counts.all, 3)
  assert.equal(res.data.questions[0]?.studentVote, 1)
})
