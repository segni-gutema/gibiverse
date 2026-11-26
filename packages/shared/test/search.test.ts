import test from "node:test"
import assert from "node:assert/strict"
import {
  SEARCH_TYPES,
  searchTypeSchema,
  searchQuerySchema,
} from "../src/types/search.js"

test("SEARCH_TYPES contains expected domain search categories", () => {
  assert.deepEqual(SEARCH_TYPES, [
    "all",
    "course-materials",
    "questions",
    "courses",
  ])
})

test("searchTypeSchema validates valid search types and rejects invalid strings", () => {
  for (const type of SEARCH_TYPES) {
    const parsed = searchTypeSchema.safeParse(type)
    assert.equal(parsed.success, true)
  }

  const invalid = searchTypeSchema.safeParse("invalid")
  assert.equal(invalid.success, false)
  if (!invalid.success) {
    assert.match(invalid.error.issues[0]?.message ?? "", /Invalid search type/)
  }
})

test("searchQuerySchema parses query parameters and provides default values", () => {
  // Empty input defaults to q="" and type="all"
  const defaultParsed = searchQuerySchema.safeParse({})
  assert.equal(defaultParsed.success, true)
  if (defaultParsed.success) {
    assert.deepEqual(defaultParsed.data, {
      q: "",
      type: "all",
    })
  }

  // Valid params are preserved
  const validParsed = searchQuerySchema.safeParse({
    q: "quantum",
    type: "course-materials",
  })
  assert.equal(validParsed.success, true)
  if (validParsed.success) {
    assert.deepEqual(validParsed.data, {
      q: "quantum",
      type: "course-materials",
    })
  }

  // Whitespace in query is trimmed
  const trimmedParsed = searchQuerySchema.safeParse({
    q: "  quantum physics  ",
    type: "questions",
  })
  assert.equal(trimmedParsed.success, true)
  if (trimmedParsed.success) {
    assert.deepEqual(trimmedParsed.data, {
      q: "quantum physics",
      type: "questions",
    })
  }

  // Invalid type is rejected
  const invalidTypeParsed = searchQuerySchema.safeParse({
    q: "test",
    type: "invalid",
  })
  assert.equal(invalidTypeParsed.success, false)

  // Valid tab filters are preserved and invalid enum filters are rejected
  const courseFilterParsed = searchQuerySchema.safeParse({
    q: "cs",
    type: "courses",
    universityId: "u1",
    departmentId: "d1",
    sort: "qa-desc",
  })
  assert.equal(courseFilterParsed.success, true)

  const invalidSortParsed = searchQuerySchema.safeParse({
    q: "cs",
    type: "courses",
    sort: "bogus",
  })
  assert.equal(invalidSortParsed.success, false)
})
