import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import db from "../src/db/index.js"
import { user } from "../src/db/schema/auth.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { question, answer } from "../src/db/schema/question.js"
import { vote } from "../src/db/schema/vote.js"
import { createVoting, calculateVoteTransition } from "../src/voting/index.js"

const suffix = Date.now()
const uniId = `uni_vt_${suffix}`
const deptId = `dept_vt_${suffix}`
const courseId = `course_vt_${suffix}`
const courseCode = `VT${String(suffix).slice(-3)}`

const userA = { id: `usr_a_${suffix}`, name: "User Alpha" }
const userB = { id: `usr_b_${suffix}`, name: "User Beta" }
const concurrentUsers = Array.from({ length: 4 }, (_, i) => ({
  id: `usr_conc_${suffix}_${i}`,
  name: `Concurrent User ${i}`,
}))

let testQuestionId: string
let testAnswerId: string

const voting = createVoting({ db })

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `Voting Domain Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `Voting Domain Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values({
    id: courseId,
    name: "Voting Domain Course",
    code: courseCode,
    universityId: uniId,
    departmentId: deptId,
  })

  // Insert test users
  const allUsers = [userA, userB, ...concurrentUsers]
  for (const u of allUsers) {
    await db.insert(user).values({
      id: u.id,
      name: u.name,
      email: `${u.id}@university.edu`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  // Insert test question
  testQuestionId = randomUUID()
  await db.insert(question).values({
    id: testQuestionId,
    title: "Domain Voting Question?",
    body: "Does domain voting work at the seam?",
    courseId,
    userId: userA.id,
  })

  // Insert test answer
  testAnswerId = randomUUID()
  await db.insert(answer).values({
    id: testAnswerId,
    body: "Yes, via voting.cast() directly.",
    questionId: testQuestionId,
    userId: userB.id,
  })
})

after(async () => {
  await db.delete(vote).where(eq(vote.targetId, testQuestionId))
  await db.delete(vote).where(eq(vote.targetId, testAnswerId))
  await db.delete(answer).where(eq(answer.id, testAnswerId))
  await db.delete(question).where(eq(question.id, testQuestionId))
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))

  const allUsers = [userA, userB, ...concurrentUsers]
  for (const u of allUsers) {
    await db.delete(user).where(eq(user.id, u.id))
  }
})

test("calculateVoteTransition computes pure transition states correctly", () => {
  // Fresh vote
  assert.deepStrictEqual(calculateVoteTransition(null, 1), {
    nextVote: 1,
    scoreDelta: 1,
  })
  assert.deepStrictEqual(calculateVoteTransition(null, -1), {
    nextVote: -1,
    scoreDelta: -1,
  })

  // Toggle off
  assert.deepStrictEqual(calculateVoteTransition(1, 1), {
    nextVote: null,
    scoreDelta: -1,
  })
  assert.deepStrictEqual(calculateVoteTransition(-1, -1), {
    nextVote: null,
    scoreDelta: 1,
  })

  // Switch direction
  assert.deepStrictEqual(calculateVoteTransition(1, -1), {
    nextVote: -1,
    scoreDelta: -2,
  })
  assert.deepStrictEqual(calculateVoteTransition(-1, 1), {
    nextVote: 1,
    scoreDelta: 2,
  })
})

test("voting.cast() validates input parameters", async () => {
  // Missing user
  const res1 = await voting.cast({
    user: null as never,
    targetType: "question",
    targetId: testQuestionId,
    value: 1,
  })
  assert.strictEqual(res1.ok, false)
  if (!res1.ok) {
    assert.strictEqual(res1.error.code, "validation")
    assert.strictEqual(res1.error.message, "User is required")
  }

  // Invalid targetType
  const res2 = await voting.cast({
    user: userA,
    targetType: "post",
    targetId: testQuestionId,
    value: 1,
  })
  assert.strictEqual(res2.ok, false)
  if (!res2.ok) {
    assert.strictEqual(res2.error.code, "validation")
    assert.strictEqual(
      res2.error.message,
      "targetType must be either 'question' or 'answer'"
    )
  }

  // Missing targetId
  const res3 = await voting.cast({
    user: userA,
    targetType: "question",
    targetId: "   ",
    value: 1,
  })
  assert.strictEqual(res3.ok, false)
  if (!res3.ok) {
    assert.strictEqual(res3.error.code, "validation")
    assert.strictEqual(res3.error.message, "targetId is required")
  }

  // Invalid value
  const res4 = await voting.cast({
    user: userA,
    targetType: "question",
    targetId: testQuestionId,
    value: 0,
  })
  assert.strictEqual(res4.ok, false)
  if (!res4.ok) {
    assert.strictEqual(res4.error.code, "validation")
    assert.strictEqual(res4.error.message, "value must be 1 or -1")
  }
})

test("voting.cast() returns not_found for non-existent target", async () => {
  const res1 = await voting.cast({
    user: userA,
    targetType: "question",
    targetId: "non-existent-question",
    value: 1,
  })
  assert.strictEqual(res1.ok, false)
  if (!res1.ok) {
    assert.strictEqual(res1.error.code, "not_found")
    assert.strictEqual(res1.error.message, "Question not found")
  }

  const res2 = await voting.cast({
    user: userA,
    targetType: "answer",
    targetId: "non-existent-answer",
    value: -1,
  })
  assert.strictEqual(res2.ok, false)
  if (!res2.ok) {
    assert.strictEqual(res2.error.code, "not_found")
    assert.strictEqual(res2.error.message, "Answer not found")
  }
})

test("voting.cast() handles question vote lifecycle: initial, toggle off, and switch", async () => {
  // 1. Initial Upvote (+1)
  const upRes = await voting.cast({
    user: userA,
    targetType: "question",
    targetId: testQuestionId,
    value: 1,
  })
  assert.strictEqual(upRes.ok, true)
  if (upRes.ok) {
    assert.strictEqual(upRes.data.score, 1)
    assert.strictEqual(upRes.data.userVote, 1)
  }

  // Verify DB
  const [q1] = await db
    .select({ voteScore: question.voteScore })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.ok(q1)
  assert.strictEqual(q1.voteScore, 1)

  // 2. Toggle Off: Re-clicking +1 removes vote
  const toggleRes = await voting.cast({
    user: userA,
    targetType: "question",
    targetId: testQuestionId,
    value: 1,
  })
  assert.strictEqual(toggleRes.ok, true)
  if (toggleRes.ok) {
    assert.strictEqual(toggleRes.data.score, 0)
    assert.strictEqual(toggleRes.data.userVote, null)
  }

  const [q2] = await db
    .select({ voteScore: question.voteScore })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.ok(q2)
  assert.strictEqual(q2.voteScore, 0)

  // 3. Downvote (-1)
  const downRes = await voting.cast({
    user: userA,
    targetType: "question",
    targetId: testQuestionId,
    value: -1,
  })
  assert.strictEqual(downRes.ok, true)
  if (downRes.ok) {
    assert.strictEqual(downRes.data.score, -1)
    assert.strictEqual(downRes.data.userVote, -1)
  }

  // 4. Switch direction (-1 to +1)
  const switchRes = await voting.cast({
    user: userA,
    targetType: "question",
    targetId: testQuestionId,
    value: 1,
  })
  assert.strictEqual(switchRes.ok, true)
  if (switchRes.ok) {
    assert.strictEqual(switchRes.data.score, 1)
    assert.strictEqual(switchRes.data.userVote, 1)
  }

  // Cleanup: toggle off
  await voting.cast({
    user: userA,
    targetType: "question",
    targetId: testQuestionId,
    value: 1,
  })
})

test("voting.cast() supports voting on answers", async () => {
  // Upvote answer
  const upRes = await voting.cast({
    user: userA,
    targetType: "answer",
    targetId: testAnswerId,
    value: 1,
  })
  assert.strictEqual(upRes.ok, true)
  if (upRes.ok) {
    assert.strictEqual(upRes.data.score, 1)
    assert.strictEqual(upRes.data.userVote, 1)
  }

  // Switch to downvote
  const downRes = await voting.cast({
    user: userA,
    targetType: "answer",
    targetId: testAnswerId,
    value: -1,
  })
  assert.strictEqual(downRes.ok, true)
  if (downRes.ok) {
    assert.strictEqual(downRes.data.score, -1)
    assert.strictEqual(downRes.data.userVote, -1)
  }

  // Toggle off
  const toggleRes = await voting.cast({
    user: userA,
    targetType: "answer",
    targetId: testAnswerId,
    value: -1,
  })
  assert.strictEqual(toggleRes.ok, true)
  if (toggleRes.ok) {
    assert.strictEqual(toggleRes.data.score, 0)
    assert.strictEqual(toggleRes.data.userVote, null)
  }
})

test("voting.cast() serializes concurrent votes from multiple users without HTTP overhead", async () => {
  const values: (1 | -1)[] = [1, 1, -1, 1] // Expected net sum = 2

  const results = await Promise.all(
    concurrentUsers.map((u, i) =>
      voting.cast({
        user: u,
        targetType: "question",
        targetId: testQuestionId,
        value: values[i],
      })
    )
  )

  for (const res of results) {
    assert.strictEqual(res.ok, true)
  }

  // Verify DB question score is exactly 2
  const [qRow] = await db
    .select({ voteScore: question.voteScore })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.ok(qRow)
  assert.strictEqual(qRow.voteScore, 2)

  // Concurrent toggle off for all 4 users
  const cleanupResults = await Promise.all(
    concurrentUsers.map((u, i) =>
      voting.cast({
        user: u,
        targetType: "question",
        targetId: testQuestionId,
        value: values[i],
      })
    )
  )

  for (const res of cleanupResults) {
    assert.strictEqual(res.ok, true)
  }

  const [qRowAfter] = await db
    .select({ voteScore: question.voteScore })
    .from(question)
    .where(eq(question.id, testQuestionId))
  assert.ok(qRowAfter)
  assert.strictEqual(qRowAfter.voteScore, 0)
})
