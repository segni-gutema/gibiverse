import test from "node:test"
import assert from "node:assert/strict"
import {
  buildSearchPageUrl,
  buildSearchQuery,
  getSearchEmptyState,
  emptySearchResponse,
} from "../app/search/presentation.js"

test("buildSearchQuery formats url and query params correctly", () => {
  assert.equal(buildSearchQuery(""), "/api/search")
  assert.equal(buildSearchQuery("   "), "/api/search")
  assert.equal(buildSearchQuery("cs101"), "/api/search?q=cs101")
  assert.equal(
    buildSearchQuery("quantum physics", "all"),
    "/api/search?q=quantum+physics"
  )
  assert.equal(
    buildSearchQuery("algorithms", "course-materials"),
    "/api/search?q=algorithms&type=course-materials"
  )
  assert.equal(
    buildSearchQuery("data structures", "questions"),
    "/api/search?q=data+structures&type=questions"
  )
  assert.equal(
    buildSearchQuery("computer science", "courses"),
    "/api/search?q=computer+science&type=courses"
  )
  assert.equal(
    buildSearchQuery("cs", "courses", { universityId: "u1", sort: "code-asc" }),
    "/api/search?q=cs&type=courses&universityId=u1&sort=code-asc"
  )
})

test("buildSearchPageUrl formats frontend page routes without /api", () => {
  assert.equal(buildSearchPageUrl(""), "/search")
  assert.equal(buildSearchPageUrl("   "), "/search")
  assert.equal(
    buildSearchPageUrl("", "course-materials"),
    "/search?type=course-materials"
  )
  assert.equal(buildSearchPageUrl("cs101"), "/search?q=cs101")
  assert.equal(
    buildSearchPageUrl("quantum physics", "all"),
    "/search?q=quantum+physics"
  )
  assert.equal(
    buildSearchPageUrl("algorithms", "course-materials"),
    "/search?q=algorithms&type=course-materials"
  )
  assert.equal(
    buildSearchPageUrl("algorithms", "courses"),
    "/search?q=algorithms&type=courses"
  )
  assert.equal(
    buildSearchPageUrl("algorithms", "courses", { universityId: "u1" }),
    "/search?q=algorithms&type=courses&universityId=u1"
  )
})

test("getSearchEmptyState handles empty and non-empty queries across tabs including courses and filters", () => {
  const initial = getSearchEmptyState("", "all")
  assert.equal(initial.title, "Search Gibiverse")
  assert.match(initial.description, /course code/)

  const noMatchAll = getSearchEmptyState("xyz123", "all")
  assert.equal(noMatchAll.title, "No results found")
  assert.match(noMatchAll.description, /xyz123/)

  const noMatchMaterials = getSearchEmptyState("xyz123", "course-materials")
  assert.equal(noMatchMaterials.title, "No course materials found")
  assert.match(noMatchMaterials.description, /xyz123/)

  const noMatchQuestions = getSearchEmptyState("xyz123", "questions")
  assert.equal(noMatchQuestions.title, "No questions found")
  assert.match(noMatchQuestions.description, /xyz123/)

  const noMatchCourses = getSearchEmptyState("xyz123", "courses")
  assert.equal(noMatchCourses.title, "No courses found")
  assert.match(noMatchCourses.description, /xyz123/)

  const filteredMaterials = getSearchEmptyState(
    "xyz123",
    "course-materials",
    true
  )
  assert.equal(
    filteredMaterials.title,
    "No course materials match these filters"
  )

  const filteredCourses = getSearchEmptyState("xyz123", "courses", true)
  assert.equal(filteredCourses.title, "No courses match these filters")
})

test("emptySearchResponse returns zeroed response with courses without network fetch for empty query", () => {
  const result = emptySearchResponse("course-materials")
  assert.equal(result.query, "")
  assert.equal(result.type, "course-materials")
  assert.deepEqual(result.counts, {
    all: 0,
    courseMaterials: 0,
    questions: 0,
    courses: 0,
  })
  assert.deepEqual(result.courseMaterials, [])
  assert.deepEqual(result.questions, [])
  assert.deepEqual(result.courses, [])

  const platformResult = emptySearchResponse("courses")
  assert.equal(platformResult.query, "")
  assert.equal(platformResult.type, "courses")
  assert.deepEqual(platformResult.counts, {
    all: 0,
    courseMaterials: 0,
    questions: 0,
    courses: 0,
  })
})
