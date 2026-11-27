import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { courseMaterial } from "../src/db/schema/course-material.js"
import { question } from "../src/db/schema/question.js"
import { user as studentTable } from "../src/db/schema/auth.js"
import { createOverview } from "../src/modules/overview/index.js"

const suffix = Date.now()
const uniId = `uni_ov_mod_${suffix}`
const deptId = `dept_ov_mod_${suffix}`
const activeCourseId = `course_ov_act_${suffix}`
const inactiveCourseId = `course_ov_inact_${suffix}`
const studentId = `stu_ov_mod_${suffix}`
const materialId = `mat_ov_mod_${suffix}`
const questionId = `q_ov_mod_${suffix}`

const overview = createOverview({ db })

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `Overview Mod Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `Overview Mod Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values([
    {
      id: activeCourseId,
      name: "Active Overview Course",
      code: `OVA${String(suffix).slice(-3)}`,
      universityId: uniId,
      departmentId: deptId,
    },
    {
      id: inactiveCourseId,
      name: "Inactive Overview Course",
      code: `OVI${String(suffix).slice(-3)}`,
      universityId: uniId,
      departmentId: deptId,
    },
  ])
  await db.insert(studentTable).values({
    id: studentId,
    name: "Overview Student",
    email: `ov_mod_${suffix}@university.edu`,
    emailVerified: true,
  })
  await db.insert(courseMaterial).values({
    id: materialId,
    title: `Overview Material ${suffix}`,
    courseMaterialType: "notes",
    academicPeriod: "2026/2027 semester 1",
    filePath: `course-materials/${materialId}/notes.pdf`,
    fileName: "notes.pdf",
    fileSize: 512,
    mimeType: "application/pdf",
    courseId: activeCourseId,
    userId: studentId,
  })
  await db.insert(question).values({
    id: questionId,
    title: `Overview Question ${suffix}`,
    body: "How does overview stats work?",
    courseId: activeCourseId,
    userId: studentId,
    voteScore: 1000,
    answerCount: 100,
  })
})

after(async () => {
  await db.delete(question).where(eq(question.id, questionId))
  await db.delete(courseMaterial).where(eq(courseMaterial.id, materialId))
  await db.delete(studentTable).where(eq(studentTable.id, studentId))
  await db.delete(course).where(eq(course.id, activeCourseId))
  await db.delete(course).where(eq(course.id, inactiveCourseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))
})

test("getStats returns aggregate counts and recent materials and questions", async () => {
  const res = await overview.getStats()
  assert.equal(res.ok, true)
  if (!res.ok) return

  assert.ok(res.data.stats.totalCourseMaterials >= 1)
  assert.ok(res.data.stats.totalQuestions >= 1)
  assert.ok(res.data.stats.activeCourses >= 1)
  assert.ok(res.data.recentCourseMaterials.length <= 6)
  assert.ok(res.data.recentQuestions.length <= 6)

  const foundMaterial = res.data.recentCourseMaterials.find(
    (m) => m.id === materialId
  )
  assert.ok(foundMaterial)
  assert.equal(foundMaterial.title, `Overview Material ${suffix}`)

  const foundQuestion = res.data.recentQuestions.find(
    (q) => q.id === questionId
  )
  assert.ok(foundQuestion)
  assert.equal(foundQuestion.title, `Overview Question ${suffix}`)
})
