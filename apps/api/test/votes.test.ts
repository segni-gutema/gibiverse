import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { app } from "../src/app.js"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { question, answer } from "../src/db/schema/question.js"
import { vote } from "../src/db/schema/vote.js"

const suffix = Date.now()
const uniId = `uni_vote_${suffix}`
const deptId = `dept_vote_${suffix}`
const courseId = `course_vote_${suffix}`
const courseCode = `VOTE${String(suffix).slice(-3)}`

let studentACookie: string
let studentAId: string
let studentBCookie: string
let testQuestionId: string
let testAnswerId: string

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `Vote Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `Vote Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values({
    id: courseId,
    name: "Vote Course",
    code: courseCode,
    universityId: uniId,
    departmentId: deptId,
  })

  // Create Student A
  const resA = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Student Alpha",
      email: `alpha_${suffix}@university.edu`,
      password: "Password123!",
    }),
  })
  assert.strictEqual(resA.status, 200)
  const cookieA = resA.headers.get("set-cookie")
  assert.ok(cookieA)
  studentACookie = cookieA.split(";")[0]!
  const sessionA = (await (
    await app.request("/api/auth/get-session", {
      headers: { cookie: studentACookie },
    })
  ).json()) as { user?: { id: string } }
  assert.ok(sessionA.user?.id)
  studentAId = sessionA.user.id

  // Create Student B
  const resB = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Student Beta",
      email: `beta_${suffix}@university.edu`,
      password: "Password123!",
    }),
  })
  assert.strictEqual(resB.status, 200)
  const cookieB = resB.headers.get("set-cookie")
  assert.ok(cookieB)
  studentBCookie = cookieB.split(";")[0]!
  const sessionB = (await (
    await app.request("/api/auth/get-session", {
      headers: { cookie: studentBCookie },
    })
  ).json()) as { user?: { id: string } }
  assert.ok(sessionB.user?.id)

  // Create question by Student A
  const qRes = await app.request("/api/questions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      title: "Test voting question?",
      body: "Does voting work as expected?",
      courseId,
    }),
  })
  assert.strictEqual(qRes.status, 201)
  const qData = (await qRes.json()) as { id: string }
  testQuestionId = qData.id

  // Create answer by Student B
  const aRes = await app.request(`/api/questions/${testQuestionId}/answers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentBCookie,
    },
    body: JSON.stringify({
      body: "Yes, voting works via POST /api/votes.",
    }),
  })
  assert.strictEqual(aRes.status, 201)
  const aData = (await aRes.json()) as { id: string }
  testAnswerId = aData.id
})

after(async () => {
  await db.delete(vote).where(eq(vote.targetId, testQuestionId))
  await db.delete(vote).where(eq(vote.targetId, testAnswerId))
  await db.delete(question).where(eq(question.id, testQuestionId))
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))
})

test("POST /api/votes requires authentication", async () => {
  const res = await app.request("/api/votes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  assert.strictEqual(res.status, 401)
})

test("POST /api/votes validates input payload", async () => {
  // Invalid targetType
  const res1 = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "resource",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  assert.strictEqual(res1.status, 400)

  // Invalid value (0)
  const res2 = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 0,
    }),
  })
  assert.strictEqual(res2.status, 400)

  // Missing targetId
  const res3 = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: "",
      value: 1,
    }),
  })
  assert.strictEqual(res3.status, 400)
})

test("POST /api/votes returns 404 for non-existent target", async () => {
  const res1 = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: "non-existent-question-id",
      value: 1,
    }),
  })
  assert.strictEqual(res1.status, 404)

  const res2 = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "answer",
      targetId: "non-existent-answer-id",
      value: 1,
    }),
  })
  assert.strictEqual(res2.status, 404)
})

test("POST /api/votes creates upvote on question, toggles off, and switches direction", async () => {
  // 1. Initial Upvote (+1)
  const upRes = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  assert.strictEqual(upRes.status, 200)
  const upData = (await upRes.json()) as {
    score: number
    userVote: number | null
  }
  assert.strictEqual(upData.score, 1)
  assert.strictEqual(upData.userVote, 1)

  // Verify in DB
  const [q1] = await db
    .select({ voteScore: question.voteScore })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.ok(q1)
  assert.strictEqual(q1.voteScore, 1)

  // 2. Toggle Off: Re-clicking +1 removes vote
  const toggleRes = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  assert.strictEqual(toggleRes.status, 200)
  const toggleData = (await toggleRes.json()) as {
    score: number
    userVote: number | null
  }
  assert.strictEqual(toggleData.score, 0)
  assert.strictEqual(toggleData.userVote, null)

  const [q2] = await db
    .select({ voteScore: question.voteScore })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.ok(q2)
  assert.strictEqual(q2.voteScore, 0)

  // 3. Downvote (-1)
  const downRes = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: -1,
    }),
  })
  assert.strictEqual(downRes.status, 200)
  const downData = (await downRes.json()) as {
    score: number
    userVote: number | null
  }
  assert.strictEqual(downData.score, -1)
  assert.strictEqual(downData.userVote, -1)

  // 4. Switch direction (-1 to +1)
  const switchRes = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  assert.strictEqual(switchRes.status, 200)
  const switchData = (await switchRes.json()) as {
    score: number
    userVote: number | null
  }
  assert.strictEqual(switchData.score, 1)
  assert.strictEqual(switchData.userVote, 1)

  // Clean up studentA vote
  await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
})

test("POST /api/votes supports voting on answers", async () => {
  // Student A upvotes answer
  const upRes = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "answer",
      targetId: testAnswerId,
      value: 1,
    }),
  })
  assert.strictEqual(upRes.status, 200)
  const upData = (await upRes.json()) as {
    score: number
    userVote: number | null
  }
  assert.strictEqual(upData.score, 1)
  assert.strictEqual(upData.userVote, 1)

  const [a1] = await db
    .select({ voteScore: answer.voteScore })
    .from(answer)
    .where(eq(answer.id, testAnswerId))
  assert.ok(a1)
  assert.strictEqual(a1.voteScore, 1)

  // Student A switches to downvote
  const downRes = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "answer",
      targetId: testAnswerId,
      value: -1,
    }),
  })
  assert.strictEqual(downRes.status, 200)
  const downData = (await downRes.json()) as {
    score: number
    userVote: number | null
  }
  assert.strictEqual(downData.score, -1)
  assert.strictEqual(downData.userVote, -1)

  // Student A toggles off downvote
  const toggleRes = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "answer",
      targetId: testAnswerId,
      value: -1,
    }),
  })
  assert.strictEqual(toggleRes.status, 200)
  const toggleData = (await toggleRes.json()) as {
    score: number
    userVote: number | null
  }
  assert.strictEqual(toggleData.score, 0)
  assert.strictEqual(toggleData.userVote, null)
})

test("POST /api/votes maintains aggregate score across multiple voters", async () => {
  // Student A upvotes question (+1)
  const resA1 = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  assert.strictEqual(resA1.status, 200)
  const dataA1 = (await resA1.json()) as { score: number }
  assert.strictEqual(dataA1.score, 1)

  // Student B upvotes question (+1) -> total 2
  const resB1 = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentBCookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  assert.strictEqual(resB1.status, 200)
  const dataB1 = (await resB1.json()) as { score: number }
  assert.strictEqual(dataB1.score, 2)

  // Student A switches to downvote (-1) -> net change -2, total 0
  const resA2 = await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: -1,
    }),
  })
  assert.strictEqual(resA2.status, 200)
  const dataA2 = (await resA2.json()) as { score: number }
  assert.strictEqual(dataA2.score, 0)

  // Clean up
  await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: -1,
    }),
  })
  await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentBCookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
})

test("database enforces unique constraint on (userId, targetType, targetId)", async () => {
  const id1 = `v1_${Date.now()}`
  const id2 = `v2_${Date.now()}`

  await db.insert(vote).values({
    id: id1,
    userId: studentAId,
    targetType: "question",
    targetId: testQuestionId,
    value: 1,
  })

  // Attempt duplicate insert with same userId, targetType, targetId
  await assert.rejects(
    async () => {
      await db.insert(vote).values({
        id: id2,
        userId: studentAId,
        targetType: "question",
        targetId: testQuestionId,
        value: -1,
      })
    },
    (err: unknown) => {
      // Postgres error code 23505 is unique_violation, Drizzle wraps in DrizzleQueryError
      const pgErr = err as {
        code?: string
        message?: string
        cause?: { code?: string; message?: string }
      }
      const code = pgErr?.code || pgErr?.cause?.code
      const msg = `${pgErr?.message || ""} ${pgErr?.cause?.message || ""}`
      return code === "23505" || /unique/i.test(msg)
    }
  )

  // Cleanup
  await db.delete(vote).where(eq(vote.id, id1))
})

test("GET /api/questions and /:id return userVote for authenticated student and null for guest", async () => {
  // Cast upvote on question and answer by student A
  await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "answer",
      targetId: testAnswerId,
      value: -1,
    }),
  })

  // 1. Guest request to question detail -> userVote should be null
  const guestDetailRes = await app.request(`/api/questions/${testQuestionId}`)
  assert.strictEqual(guestDetailRes.status, 200)
  const guestDetail = (await guestDetailRes.json()) as {
    userVote: number | null
    answers: Array<{ userVote: number | null }>
  }
  assert.strictEqual(guestDetail.userVote, null)
  assert.strictEqual(guestDetail.answers[0]?.userVote, null)

  // 2. Student A request to question detail -> userVote should reflect active votes
  const authDetailRes = await app.request(`/api/questions/${testQuestionId}`, {
    headers: { cookie: studentACookie },
  })
  assert.strictEqual(authDetailRes.status, 200)
  const authDetail = (await authDetailRes.json()) as {
    userVote: number | null
    answers: Array<{ userVote: number | null }>
  }
  assert.strictEqual(authDetail.userVote, 1)
  assert.strictEqual(authDetail.answers[0]?.userVote, -1)

  // 3. Student A request to list questions -> userVote should be 1
  const listRes = await app.request("/api/questions", {
    headers: { cookie: studentACookie },
  })
  assert.strictEqual(listRes.status, 200)
  const listData = (await listRes.json()) as Array<{
    id: string
    userVote: number | null
  }>
  const foundQ = listData.find((q) => q.id === testQuestionId)
  assert.ok(foundQ)
  assert.strictEqual(foundQ.userVote, 1)

  // Clean up votes
  await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "question",
      targetId: testQuestionId,
      value: 1,
    }),
  })
  await app.request("/api/votes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: studentACookie,
    },
    body: JSON.stringify({
      targetType: "answer",
      targetId: testAnswerId,
      value: -1,
    }),
  })
})

test("concurrent votes from multiple students maintain score count integrity", async () => {
  // Create 4 distinct students with session cookies
  const cookies: string[] = []
  const values = [1, 1, -1, 1] // Expected sum = 2

  for (let i = 0; i < values.length; i++) {
    const res = await app.request("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `Concurrent Student ${i}`,
        email: `concurrent_${suffix}_${i}@university.edu`,
        password: "ConcurrentPass123!",
      }),
    })
    assert.strictEqual(res.status, 200)
    const cookie = res.headers.get("set-cookie")?.split(";")[0]
    assert.ok(cookie)
    cookies.push(cookie)
  }

  // Issue all 4 votes concurrently using Promise.all
  const results = await Promise.all(
    cookies.map((cookie, idx) =>
      app.request("/api/votes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          targetType: "question",
          targetId: testQuestionId,
          value: values[idx],
        }),
      })
    )
  )

  for (const res of results) {
    assert.strictEqual(res.status, 200)
  }

  // Verify DB question voteScore is exactly 2
  const [qRow] = await db
    .select({ voteScore: question.voteScore })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.ok(qRow)
  assert.strictEqual(qRow.voteScore, 2)

  // Clean up: concurrent toggle off for all 4 students
  const cleanupResults = await Promise.all(
    cookies.map((cookie, idx) =>
      app.request("/api/votes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          targetType: "question",
          targetId: testQuestionId,
          value: values[idx],
        }),
      })
    )
  )

  for (const res of cleanupResults) {
    assert.strictEqual(res.status, 200)
  }

  const [qRowAfter] = await db
    .select({ voteScore: question.voteScore })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.ok(qRowAfter)
  assert.strictEqual(qRowAfter.voteScore, 0)
})
