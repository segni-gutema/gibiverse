import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { user as studentTable } from "../src/db/schema/auth.js"
import { question } from "../src/db/schema/question.js"
import { vote } from "../src/db/schema/vote.js"
import { createQa } from "../src/qa/index.js"

const suffix = Date.now()
const uniId = `uni_qa_${suffix}`
const deptId = `dept_qa_${suffix}`
const courseId = `course_qa_${suffix}`
const courseCode = `QA${String(suffix).slice(-3)}`
const authorId = `stu_qa_author_${suffix}`
const respondentId = `stu_qa_resp_${suffix}`

const qa = createQa({ db })
const author = { id: authorId, name: "QA Author" }
const respondent = { id: respondentId, name: "QA Respondent" }

const createdQuestionIds: string[] = []

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `QA Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `QA Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values({
    id: courseId,
    name: "QA Course",
    code: courseCode,
    universityId: uniId,
    departmentId: deptId,
  })
  await db.insert(studentTable).values([
    {
      id: authorId,
      name: author.name,
      email: `qa_author_${suffix}@university.edu`,
      emailVerified: true,
    },
    {
      id: respondentId,
      name: respondent.name,
      email: `qa_resp_${suffix}@university.edu`,
      emailVerified: true,
    },
  ])
})

after(async () => {
  for (const id of createdQuestionIds) {
    await db.delete(question).where(eq(question.id, id))
  }
  await db.delete(studentTable).where(eq(studentTable.id, authorId))
  await db.delete(studentTable).where(eq(studentTable.id, respondentId))
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))
})

test("ask creates a Question for a Course", async () => {
  const result = await qa.ask({
    student: author,
    title: "What is a binary search tree?",
    body: "Looking for a clear definition.",
    courseId,
  })

  assert.equal(result.ok, true)
  if (!result.ok) return

  createdQuestionIds.push(result.data.id)
  assert.equal(result.data.title, "What is a binary search tree?")
  assert.equal(result.data.body, "Looking for a clear definition.")
  assert.equal(result.data.courseId, courseId)
  assert.equal(result.data.userId, authorId)
})

test("ask rejects empty title, body, or course", async () => {
  const result = await qa.ask({
    student: author,
    title: "  ",
    body: "body",
    courseId: "",
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "validation")
  assert.match(result.error.message, /title|course|body/i)
})

test("ask rejects unknown Course", async () => {
  const result = await qa.ask({
    student: author,
    title: "Valid title",
    body: "Valid body",
    courseId: "missing-course",
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "validation")
  assert.match(result.error.message, /course not found/i)
})

test("list returns Questions for a Course and enriches student Vote", async () => {
  const asked = await qa.ask({
    student: author,
    title: "List me",
    body: "Body for list",
    courseId,
  })
  assert.equal(asked.ok, true)
  if (!asked.ok) return
  createdQuestionIds.push(asked.data.id)

  await db.insert(vote).values({
    id: `vote_qa_${suffix}`,
    userId: respondentId,
    targetType: "question",
    targetId: asked.data.id,
    value: 1,
  })

  const anon = await qa.list({
    student: null,
    filters: { courseId, sort: "newest" },
  })
  assert.equal(anon.ok, true)
  if (!anon.ok) return
  const anonRow = anon.data.find((row) => row.id === asked.data.id)
  assert.ok(anonRow)
  assert.equal(anonRow.studentVote, null)

  const asRespondent = await qa.list({
    student: respondent,
    filters: { courseId, sort: "newest" },
  })
  assert.equal(asRespondent.ok, true)
  if (!asRespondent.ok) return
  const voted = asRespondent.data.find((row) => row.id === asked.data.id)
  assert.ok(voted)
  assert.equal(voted.studentVote, 1)

  await db.delete(vote).where(eq(vote.id, `vote_qa_${suffix}`))
})

test("get returns Question with Answers and Accepted Answer flag", async () => {
  const asked = await qa.ask({
    student: author,
    title: "Get me",
    body: "Detail body",
    courseId,
  })
  assert.equal(asked.ok, true)
  if (!asked.ok) return
  createdQuestionIds.push(asked.data.id)

  const answered = await qa.answer({
    student: respondent,
    questionId: asked.data.id,
    body: "Here is an Answer",
  })
  assert.equal(answered.ok, true)
  if (!answered.ok) return

  const accepted = await qa.accept({
    student: author,
    questionId: asked.data.id,
    answerId: answered.data.id,
  })
  assert.equal(accepted.ok, true)
  if (!accepted.ok) return
  assert.equal(accepted.data.acceptedAnswerId, answered.data.id)

  const detail = await qa.get({
    student: null,
    questionId: asked.data.id,
  })
  assert.equal(detail.ok, true)
  if (!detail.ok) return
  assert.equal(detail.data.id, asked.data.id)
  assert.equal(detail.data.answers.length, 1)
  assert.equal(detail.data.answers[0]?.isAccepted, true)
  assert.equal(detail.data.acceptedAnswerId, answered.data.id)
})

test("get returns not_found for unknown Question", async () => {
  const result = await qa.get({
    student: null,
    questionId: "missing-question",
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "not_found")
})

test("answer increments answerCount and rejects empty body", async () => {
  const asked = await qa.ask({
    student: author,
    title: "Answer count",
    body: "Need answers",
    courseId,
  })
  assert.equal(asked.ok, true)
  if (!asked.ok) return
  createdQuestionIds.push(asked.data.id)

  const empty = await qa.answer({
    student: respondent,
    questionId: asked.data.id,
    body: "   ",
  })
  assert.equal(empty.ok, false)
  if (empty.ok) return
  assert.equal(empty.error.code, "validation")

  const posted = await qa.answer({
    student: respondent,
    questionId: asked.data.id,
    body: "A real Answer",
  })
  assert.equal(posted.ok, true)
  if (!posted.ok) return
  assert.equal(posted.data.isAccepted, false)
  assert.equal(posted.data.studentId, respondentId)

  const [row] = await db
    .select({ answerCount: question.answerCount })
    .from(question)
    .where(eq(question.id, asked.data.id))
  assert.equal(row?.answerCount, 1)
})

test("accept forbids non-author and can toggle Accepted Answer off", async () => {
  const asked = await qa.ask({
    student: author,
    title: "Accept rules",
    body: "Who can accept?",
    courseId,
  })
  assert.equal(asked.ok, true)
  if (!asked.ok) return
  createdQuestionIds.push(asked.data.id)

  const posted = await qa.answer({
    student: respondent,
    questionId: asked.data.id,
    body: "Candidate Answer",
  })
  assert.equal(posted.ok, true)
  if (!posted.ok) return

  const forbidden = await qa.accept({
    student: respondent,
    questionId: asked.data.id,
    answerId: posted.data.id,
  })
  assert.equal(forbidden.ok, false)
  if (forbidden.ok) return
  assert.equal(forbidden.error.code, "forbidden")

  const marked = await qa.accept({
    student: author,
    questionId: asked.data.id,
    answerId: posted.data.id,
  })
  assert.equal(marked.ok, true)
  if (!marked.ok) return
  assert.equal(marked.data.acceptedAnswerId, posted.data.id)

  const unmarked = await qa.accept({
    student: author,
    questionId: asked.data.id,
    answerId: posted.data.id,
  })
  assert.equal(unmarked.ok, true)
  if (!unmarked.ok) return
  assert.equal(unmarked.data.acceptedAnswerId, null)
})
