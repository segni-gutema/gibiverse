import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { question } from "../src/db/schema/question.js"

const suffix = Date.now()
const uniId = `uni_q_${suffix}`
const deptId = `dept_q_${suffix}`
const courseId = `course_q_${suffix}`
const courseCode = `Q${String(suffix).slice(-3)}`

let sessionCookie: string
let studentId: string
const createdQuestionIds: string[] = []

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `Question Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `Question Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values({
    id: courseId,
    name: "Question Course",
    code: courseCode,
    universityId: uniId,
    departmentId: deptId,
  })

  const email = `question_${suffix}@university.edu`
  const password = "QuestionPassword123!"
  const signUpRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Question Student",
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
})

after(async () => {
  for (const id of createdQuestionIds) {
    await db.delete(question).where(eq(question.id, id))
  }
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))
})

test("POST /api/questions requires authentication", async () => {
  const res = await app.request("/api/questions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "How does recursion work?",
      body: "I am stuck on the base case.",
      courseId,
    }),
  })
  assert.strictEqual(res.status, 401)
})

test("POST /api/questions rejects missing title, body, or course", async () => {
  const res = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie,
    },
    body: JSON.stringify({
      title: "",
      body: "Missing title and course",
      courseId: "",
    }),
  })
  assert.strictEqual(res.status, 400)
  const payload = (await res.json()) as { error: string }
  assert.match(payload.error, /title|course|body/i)
})

test("POST /api/questions creates a question for the authenticated student", async () => {
  const res = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie,
    },
    body: JSON.stringify({
      title: "What is Big-O of binary search?",
      body: "Looking for a clear explanation of the time complexity.",
      courseId,
    }),
  })
  assert.strictEqual(res.status, 201)
  const payload = (await res.json()) as {
    id: string
    title: string
    body: string
    courseId: string
    userId: string
    voteScore: number
    answerCount: number
  }

  createdQuestionIds.push(payload.id)
  assert.strictEqual(payload.title, "What is Big-O of binary search?")
  assert.strictEqual(
    payload.body,
    "Looking for a clear explanation of the time complexity."
  )
  assert.strictEqual(payload.courseId, courseId)
  assert.strictEqual(payload.userId, studentId)
  assert.strictEqual(payload.voteScore, 0)
  assert.strictEqual(payload.answerCount, 0)

  const [row] = await db
    .select()
    .from(question)
    .where(eq(question.id, payload.id))
  assert.ok(row)
  assert.strictEqual(row.userId, studentId)
  assert.strictEqual(row.title, "What is Big-O of binary search?")
})

test("POST /api/questions rejects title exceeding 200 characters at route boundary", async () => {
  const res = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie,
    },
    body: JSON.stringify({
      title: "a".repeat(201),
      body: "Valid body text",
      courseId,
    }),
  })
  assert.strictEqual(res.status, 400)
  const payload = (await res.json()) as { error: string }
  assert.match(payload.error, /title/i)
})

test("POST /api/questions trims whitespace on title and body", async () => {
  const res = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie,
    },
    body: JSON.stringify({
      title: "   Trimmed Question Title   ",
      body: "   Trimmed body content.   ",
      courseId,
    }),
  })
  assert.strictEqual(res.status, 201)
  const payload = (await res.json()) as {
    id: string
    title: string
    body: string
  }
  createdQuestionIds.push(payload.id)
  assert.strictEqual(payload.title, "Trimmed Question Title")
  assert.strictEqual(payload.body, "Trimmed body content.")
})
