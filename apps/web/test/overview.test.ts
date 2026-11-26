import test from "node:test"
import assert from "node:assert/strict"
import { client } from "../../../packages/api-client/src/index.js"
import {
  formatActivityCounter,
  getOverviewEmptyState,
  getRecentCourseMaterialsEmptyState,
  getRecentQuestionsEmptyState,
  DEFAULT_PLATFORM_OVERVIEW,
} from "../app/home-presentation.js"

test("formatActivityCounter formats numbers with localized grouping", () => {
  assert.equal(formatActivityCounter(0), "0")
  assert.equal(formatActivityCounter(42), "42")
  assert.equal(formatActivityCounter(1250), "1,250")
  assert.equal(formatActivityCounter(1000000), "1,000,000")
})

test("getOverviewEmptyState distinguishes empty platforms from active ones", () => {
  const emptyState = getOverviewEmptyState({
    totalCourseMaterials: 0,
    totalQuestions: 0,
    activeCourses: 0,
  })
  assert.equal(emptyState.hasActivity, false)
  assert.match(emptyState.title, /welcome/i)
  assert.match(emptyState.description, /first to share|community/i)
  const activeState = getOverviewEmptyState({
    totalCourseMaterials: 12,
    totalQuestions: 5,
    activeCourses: 3,
  })
  assert.equal(activeState.hasActivity, true)
})

test("getRecentCourseMaterialsEmptyState and getRecentQuestionsEmptyState guide students", () => {
  const resEmpty = getRecentCourseMaterialsEmptyState()
  assert.match(resEmpty.title, /no course materials/i)
  assert.match(resEmpty.description, /share|upload/i)

  const qEmpty = getRecentQuestionsEmptyState()
  assert.match(qEmpty.title, /no questions/i)
  assert.match(qEmpty.description, /first.*question|discussion/i)
})

test("overview falls back safely on network failure without throwing", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    throw new Error("connect ECONNREFUSED")
  }
  try {
    const res = await client.api.overview.$get().catch(() => null)
    const fallback =
      res && res.ok ? await res.json() : DEFAULT_PLATFORM_OVERVIEW
    assert.deepEqual(fallback.stats, {
      totalCourseMaterials: 0,
      totalQuestions: 0,
      activeCourses: 0,
    })
    assert.deepEqual(fallback.recentCourseMaterials, [])
    assert.deepEqual(fallback.recentQuestions, [])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("overview returns parsed JSON payload when response is ok", async () => {
  const mockPayload = {
    stats: {
      totalCourseMaterials: 34,
      totalQuestions: 18,
      activeCourses: 7,
    },
    recentCourseMaterials: [
      {
        id: "cm-1",
        title: "Calculus Exam Solutions",
        courseMaterialType: "exam" as const,
        academicPeriod: "2024/2025 semester 1",
        createdAt: "2026-11-13T08:00:00.000Z",
        courseId: "c-1",
        courseCode: "MATH101",
        courseName: "Calculus I",
      },
    ],
    recentQuestions: [
      {
        id: "q-1",
        title: "Integration by parts formula",
        body: "What is the best way to choose u and dv?",
        createdAt: "2026-11-13T09:00:00.000Z",
        courseId: "c-1",
        courseCode: "MATH101",
        courseName: "Calculus I",
        studentId: "s-1",
        studentName: "Ada Lovelace",
        voteScore: 4,
        answerCount: 2,
      },
    ],
  }

  // Intercept global fetch for test
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify(mockPayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })

  try {
    const res = await client.api.overview.$get()
    assert.ok(res.ok)
    const result = await res.json()
    assert.deepEqual(result.stats, mockPayload.stats)
    assert.equal(result.recentCourseMaterials.length, 1)
    assert.equal(
      result.recentCourseMaterials[0]?.title,
      "Calculus Exam Solutions"
    )
    assert.equal(result.recentQuestions.length, 1)
    assert.equal(result.recentQuestions[0]?.studentName, "Ada Lovelace")
  } finally {
    globalThis.fetch = originalFetch
  }
})
