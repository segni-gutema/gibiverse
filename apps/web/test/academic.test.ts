import test from "node:test"
import assert from "node:assert/strict"
import {
  filterCoursesByDepartment,
  filterCoursesByUniversity,
  groupCoursesByDepartment,
} from "../app/courses/presentation.js"
import { SAMPLE_COURSES, SAMPLE_DEPARTMENTS } from "./fixtures.js"

test("filterCoursesByUniversity returns only courses for the selected university", () => {
  const filtered = filterCoursesByUniversity(SAMPLE_COURSES, "uni_aau")
  assert.deepStrictEqual(filtered.map((c) => c.code).sort(), [
    "CS101",
    "CS201",
    "MATH101",
  ])
})

test("filterCoursesByUniversity returns empty list when no university is selected", () => {
  assert.deepStrictEqual(filterCoursesByUniversity(SAMPLE_COURSES, null), [])
  assert.deepStrictEqual(
    filterCoursesByUniversity(SAMPLE_COURSES, undefined),
    []
  )
})

test("filterCoursesByDepartment returns only courses for the selected department", () => {
  const filtered = filterCoursesByDepartment(SAMPLE_COURSES, "dept_cs")
  assert.deepStrictEqual(filtered.map((c) => c.code).sort(), ["CS101", "CS201"])
})

test("filterCoursesByDepartment returns empty list when no department is selected", () => {
  assert.deepStrictEqual(filterCoursesByDepartment(SAMPLE_COURSES, null), [])
  assert.deepStrictEqual(
    filterCoursesByDepartment(SAMPLE_COURSES, undefined),
    []
  )
})

test("groupCoursesByDepartment nests sorted courses under each department", () => {
  const grouped = groupCoursesByDepartment(
    SAMPLE_DEPARTMENTS.slice(0, 2),
    SAMPLE_COURSES.filter((c) => c.universityId === "uni_aau")
  )
  assert.strictEqual(grouped[0]?.name, "Computer Science")
  assert.deepStrictEqual(
    grouped[0]?.courses.map((c) => c.code),
    ["CS101", "CS201"]
  )
  assert.deepStrictEqual(
    grouped[1]?.courses.map((c) => c.code),
    ["MATH101"]
  )
})
