import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { question, answer } from "../src/db/schema/question.js"

const suffix = Date.now()
const uniId = `uni_ans_${suffix}`
const deptId = `dept_ans_${suffix}`
const courseId = `course_ans_${suffix}`
const courseCode = `ANS${String(suffix).slice(-3)}`

let authorCookie: string
let authorId: string
let respondentCookie: string
let respondentId: string
let testQuestionId: string
const createdQuestionIds: string[] = []

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `Answer Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `Answer Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values({
    id: courseId,
    name: "Answer Course",
    code: courseCode,
    universityId: uniId,
    departmentId: deptId,
  })

  // Create question author
  const authorRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Author Student",
      email: `author_${suffix}@university.edu`,
      password: "AuthorPassword123!",
    }),
  })
  assert.strictEqual(authorRes.status, 200)
  const authorCookieHeader = authorRes.headers.get("set-cookie")
  assert.ok(authorCookieHeader)
  authorCookie = authorCookieHeader.split(";")[0]!
  const authorSession = (await (
    await app.request("/api/auth/get-session", {
      headers: { cookie: authorCookie },
    })
  ).json()) as { user?: { id: string } }
  assert.ok(authorSession.user?.id)
  authorId = authorSession.user.id

  // Create second student (respondent)
  const respRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Respondent Student",
      email: `respondent_${suffix}@university.edu`,
      password: "RespondentPassword123!",
    }),
  })
  assert.strictEqual(respRes.status, 200)
  const respCookieHeader = respRes.headers.get("set-cookie")
  assert.ok(respCookieHeader)
  respondentCookie = respCookieHeader.split(";")[0]!
  const respSession = (await (
    await app.request("/api/auth/get-session", {
      headers: { cookie: respondentCookie },
    })
  ).json()) as { user?: { id: string } }
  assert.ok(respSession.user?.id)
  respondentId = respSession.user.id

  // Post a test question by author
  const qRes = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authorCookie,
    },
    body: JSON.stringify({
      title: "How to reverse a linked list?",
      body: "Need step-by-step pointers.",
      courseId,
    }),
  })
  assert.strictEqual(qRes.status, 201)
  const qBody = (await qRes.json()) as { id: string }
  testQuestionId = qBody.id
  createdQuestionIds.push(testQuestionId)
})

after(async () => {
  for (const id of createdQuestionIds) {
    await db.delete(question).where(eq(question.id, id))
  }
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))
})

test("POST /api/questions/:id/answers requires authentication", async () => {
  const res = await app.request(`/api/questions/${testQuestionId}/answers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body: "Here is the answer" }),
  })
  assert.strictEqual(res.status, 401)
})

test("POST /api/questions/:id/answers validates answer body", async () => {
  const res = await app.request(`/api/questions/${testQuestionId}/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: respondentCookie,
    },
    body: JSON.stringify({ body: "   " }),
  })
  assert.strictEqual(res.status, 400)
  const data = (await res.json()) as { error: string }
  assert.match(data.error, /body/i)
})

test("POST /api/questions/:id/answers returns 404 for non-existent question", async () => {
  const res = await app.request(`/api/questions/non-existent-id/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: respondentCookie,
    },
    body: JSON.stringify({ body: "An answer to nothing" }),
  })
  assert.strictEqual(res.status, 404)
})

test("POST /api/questions/:id/answers creates answer and increments answerCount", async () => {
  const res = await app.request(`/api/questions/${testQuestionId}/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: respondentCookie,
    },
    body: JSON.stringify({
      body: "Track prev, curr, and next pointers while traversing.",
    }),
  })
  assert.strictEqual(res.status, 201)
  const data = (await res.json()) as {
    id: string
    body: string
    questionId: string
    userId: string
    voteScore: number
    createdAt: string
  }
  assert.ok(data.id)
  assert.strictEqual(
    data.body,
    "Track prev, curr, and next pointers while traversing."
  )
  assert.strictEqual(data.questionId, testQuestionId)
  assert.strictEqual(data.userId, respondentId)
  assert.strictEqual(data.voteScore, 0)

  // Verify answerCount incremented in question row
  const [qRow] = await db
    .select({ answerCount: question.answerCount })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.strictEqual(qRow?.answerCount, 1)

  // Verify answer exists in database
  const [ansRow] = await db.select().from(answer).where(eq(answer.id, data.id))
  assert.ok(ansRow)
  assert.strictEqual(ansRow.questionId, testQuestionId)
})

test("foreign key cascades delete answers when question is deleted", async () => {
  // Create a temporary question with an answer
  const qRes = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authorCookie,
    },
    body: JSON.stringify({
      title: "Temporary Question for Cascade Test",
      body: "This question will be deleted.",
      courseId,
    }),
  })
  const tempQ = (await qRes.json()) as { id: string }
  createdQuestionIds.push(tempQ.id)

  const ansRes = await app.request(`/api/questions/${tempQ.id}/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: respondentCookie,
    },
    body: JSON.stringify({ body: "Temporary answer to be cascaded." }),
  })
  assert.strictEqual(ansRes.status, 201)
  const tempAns = (await ansRes.json()) as { id: string }

  // Delete question
  await db.delete(question).where(eq(question.id, tempQ.id))

  // Assert answer was cascade-deleted by database foreign key
  const [remainingAns] = await db
    .select()
    .from(answer)
    .where(eq(answer.id, tempAns.id))
  assert.strictEqual(remainingAns, undefined)
})

test("POST /api/questions/:id/accept requires authentication", async () => {
  const res = await app.request(`/api/questions/${testQuestionId}/accept`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answerId: "some-id" }),
  })
  assert.strictEqual(res.status, 401)
})

test("POST /api/questions/:id/accept rejects invalid answerId at route boundary", async () => {
  const res = await app.request(`/api/questions/${testQuestionId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authorCookie,
    },
    body: JSON.stringify({ answerId: "   " }),
  })
  assert.strictEqual(res.status, 400)
  const err = (await res.json()) as { error: string }
  assert.match(err.error, /answer/i)
})

test("POST /api/questions/:id/accept rejects non-author student with 403 Forbidden", async () => {
  // Post an answer first
  const ansRes = await app.request(`/api/questions/${testQuestionId}/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: respondentCookie,
    },
    body: JSON.stringify({ body: "A good solution" }),
  })
  const ansData = (await ansRes.json()) as { id: string }

  // Respondent (non-author of question) tries to accept
  const res = await app.request(`/api/questions/${testQuestionId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: respondentCookie,
    },
    body: JSON.stringify({ answerId: ansData.id }),
  })
  assert.strictEqual(res.status, 403)
  const err = (await res.json()) as { error: string }
  assert.match(err.error, /only the question author/i)
})

test("POST /api/questions/:id/accept validates answer belongs to the question", async () => {
  // Create another question with an answer
  const otherQRes = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authorCookie,
    },
    body: JSON.stringify({
      title: "Another Question",
      body: "Another question body",
      courseId,
    }),
  })
  const otherQ = (await otherQRes.json()) as { id: string }
  createdQuestionIds.push(otherQ.id)

  const otherAnsRes = await app.request(`/api/questions/${otherQ.id}/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: respondentCookie,
    },
    body: JSON.stringify({ body: "Answer to another question" }),
  })
  const otherAns = (await otherAnsRes.json()) as { id: string }

  // Question author tries to accept an answer from a different question
  const res = await app.request(`/api/questions/${testQuestionId}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authorCookie,
    },
    body: JSON.stringify({ answerId: otherAns.id }),
  })
  assert.strictEqual(res.status, 400)
  const err = (await res.json()) as { error: string }
  assert.match(err.error, /answer does not belong to this question/i)
})

test("question author can accept, change, and unmark an accepted answer", async () => {
  // Post two answers
  const ans1Res = await app.request(
    `/api/questions/${testQuestionId}/answers`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: respondentCookie,
      },
      body: JSON.stringify({ body: "Solution 1" }),
    }
  )
  const ans1 = (await ans1Res.json()) as { id: string }

  const ans2Res = await app.request(
    `/api/questions/${testQuestionId}/answers`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: respondentCookie,
      },
      body: JSON.stringify({ body: "Solution 2 (better)" }),
    }
  )
  const ans2 = (await ans2Res.json()) as { id: string }

  // 1. Author marks ans1 as accepted
  const accept1Res = await app.request(
    `/api/questions/${testQuestionId}/accept`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie,
      },
      body: JSON.stringify({ answerId: ans1.id }),
    }
  )
  assert.strictEqual(accept1Res.status, 200)
  const accept1Data = (await accept1Res.json()) as {
    acceptedAnswerId: string | null
  }
  assert.strictEqual(accept1Data.acceptedAnswerId, ans1.id)

  let [dbQ] = await db
    .select({ acceptedAnswerId: question.acceptedAnswerId })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.strictEqual(dbQ?.acceptedAnswerId, ans1.id)

  // 2. Author changes accepted answer to ans2
  const accept2Res = await app.request(
    `/api/questions/${testQuestionId}/accept`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie,
      },
      body: JSON.stringify({ answerId: ans2.id }),
    }
  )
  assert.strictEqual(accept2Res.status, 200)
  const accept2Data = (await accept2Res.json()) as {
    acceptedAnswerId: string | null
  }
  assert.strictEqual(accept2Data.acceptedAnswerId, ans2.id)

  ;[dbQ] = await db
    .select({ acceptedAnswerId: question.acceptedAnswerId })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.strictEqual(dbQ?.acceptedAnswerId, ans2.id)

  // 3. Author unmarks accepted answer (by sending null or toggling the same answer)
  const unmarkRes = await app.request(
    `/api/questions/${testQuestionId}/accept`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie,
      },
      body: JSON.stringify({ answerId: null }),
    }
  )
  assert.strictEqual(unmarkRes.status, 200)
  const unmarkData = (await unmarkRes.json()) as {
    acceptedAnswerId: string | null
  }
  assert.strictEqual(unmarkData.acceptedAnswerId, null)

  ;[dbQ] = await db
    .select({ acceptedAnswerId: question.acceptedAnswerId })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.strictEqual(dbQ?.acceptedAnswerId, null)
})

test("GET /api/questions/:id returns 404 for non-existent question", async () => {
  const res = await app.request("/api/questions/non-existent-id")
  assert.strictEqual(res.status, 404)
})

test("GET /api/questions/:id returns question with author, course, and answers in chronological order", async () => {
  // Create a dedicated question with 2 answers at spaced intervals
  const qRes = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authorCookie,
    },
    body: JSON.stringify({
      title: "Detailed Question Discussion",
      body: "Testing chronological answer ordering.",
      courseId,
    }),
  })
  assert.strictEqual(qRes.status, 201)
  const qData = (await qRes.json()) as { id: string }
  createdQuestionIds.push(qData.id)

  // Post first answer
  const a1Res = await app.request(`/api/questions/${qData.id}/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: respondentCookie,
    },
    body: JSON.stringify({ body: "First chronological answer" }),
  })
  assert.strictEqual(a1Res.status, 201)
  const a1Data = (await a1Res.json()) as { id: string }

  // Small delay to ensure distinct timestamp if needed
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Post second answer by author
  const a2Res = await app.request(`/api/questions/${qData.id}/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authorCookie,
    },
    body: JSON.stringify({ body: "Second chronological answer" }),
  })
  assert.strictEqual(a2Res.status, 201)
  const a2Data = (await a2Res.json()) as { id: string }

  // Accept second answer
  await app.request(`/api/questions/${qData.id}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: authorCookie,
    },
    body: JSON.stringify({ answerId: a2Data.id }),
  })

  // Fetch question detail
  const detailRes = await app.request(`/api/questions/${qData.id}`)
  assert.strictEqual(detailRes.status, 200)
  const detail = (await detailRes.json()) as {
    id: string
    title: string
    body: string
    courseId: string
    courseCode: string
    courseName: string
    studentId: string
    studentName: string
    acceptedAnswerId: string | null
    answers: Array<{
      id: string
      body: string
      studentId: string
      studentName: string
      isAccepted: boolean
      createdAt: string
    }>
  }

  assert.strictEqual(detail.id, qData.id)
  assert.strictEqual(detail.title, "Detailed Question Discussion")
  assert.strictEqual(detail.studentId, authorId)
  assert.strictEqual(detail.studentName, "Author Student")
  assert.strictEqual(detail.courseId, courseId)
  assert.strictEqual(detail.acceptedAnswerId, a2Data.id)
  assert.strictEqual(detail.answers.length, 2)

  // Chronological verification: first answer submitted appears first
  assert.strictEqual(detail.answers[0]?.id, a1Data.id)
  assert.strictEqual(detail.answers[0]?.body, "First chronological answer")
  assert.strictEqual(detail.answers[0]?.studentName, "Respondent Student")
  assert.strictEqual(detail.answers[0]?.isAccepted, false)

  assert.strictEqual(detail.answers[1]?.id, a2Data.id)
  assert.strictEqual(detail.answers[1]?.body, "Second chronological answer")
  assert.strictEqual(detail.answers[1]?.studentName, "Author Student")
  assert.strictEqual(detail.answers[1]?.isAccepted, true)
})
