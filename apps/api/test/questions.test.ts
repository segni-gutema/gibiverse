import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { question } from "../src/db/schema/question.js"
import {
  createAuthenticatedStudent,
  createTestScope,
  seedAcademicHierarchy,
  type SeededAcademicHierarchy,
} from "./fixtures.js"

const scope = createTestScope("q")
let academic: SeededAcademicHierarchy
let courseId: string

let sessionCookie: string
let studentId: string
const createdQuestionIds: string[] = []

before(async () => {
  academic = await seedAcademicHierarchy({
    scope,
    universityName: `Question Uni ${scope.suffix}`,
    departmentName: `Question Dept ${scope.suffix}`,
    courseName: "Question Course",
    courseCodeTag: "Q",
  })
  courseId = academic.courseId

  const student = await createAuthenticatedStudent({
    scope,
    label: "question",
    name: "Question Student",
    password: "QuestionPassword123!",
  })
  sessionCookie = student.cookie
  studentId = student.userId
})

after(async () => {
  for (const id of createdQuestionIds) {
    await db.delete(question).where(eq(question.id, id))
  }
  await academic.cleanup()
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
