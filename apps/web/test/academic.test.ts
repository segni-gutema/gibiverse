import test from "node:test"
import assert from "node:assert/strict"
import {
  filterCoursesByDepartment,
  filterCoursesByUniversity,
  groupCoursesByDepartment,
  type Course,
  type Department,
} from "../app/courses/presentation.js"

const departments: Department[] = [
  { id: "dept_cs", name: "Computer Science", universityId: "uni_1" },
  { id: "dept_math", name: "Mathematics", universityId: "uni_1" },
]

const courses: Course[] = [
  {
    id: "c1",
    code: "CS201",
    name: "Data Structures",
    universityId: "uni_1",
    departmentId: "dept_cs",
  },
  {
    id: "c2",
    code: "CS101",
    name: "Introduction to Programming",
    universityId: "uni_1",
    departmentId: "dept_cs",
  },
  {
    id: "c3",
    code: "MA101",
    name: "Calculus I",
    universityId: "uni_2",
    departmentId: "dept_math",
  },
]

test("filterCoursesByUniversity returns only courses for the selected university", () => {
  const filtered = filterCoursesByUniversity(courses, "uni_1")
  assert.deepStrictEqual(filtered.map((c) => c.code).sort(), ["CS101", "CS201"])
})

test("filterCoursesByUniversity returns empty list when no university is selected", () => {
  assert.deepStrictEqual(filterCoursesByUniversity(courses, null), [])
  assert.deepStrictEqual(filterCoursesByUniversity(courses, undefined), [])
})

test("filterCoursesByDepartment returns only courses for the selected department", () => {
  const filtered = filterCoursesByDepartment(courses, "dept_cs")
  assert.deepStrictEqual(filtered.map((c) => c.code).sort(), ["CS101", "CS201"])
})

test("filterCoursesByDepartment returns empty list when no department is selected", () => {
  assert.deepStrictEqual(filterCoursesByDepartment(courses, null), [])
  assert.deepStrictEqual(filterCoursesByDepartment(courses, undefined), [])
})

test("groupCoursesByDepartment nests sorted courses under each department", () => {
  const grouped = groupCoursesByDepartment(departments, courses)
  assert.strictEqual(grouped[0]?.name, "Computer Science")
  assert.deepStrictEqual(
    grouped[0]?.courses.map((c) => c.code),
    ["CS101", "CS201"]
  )
  assert.deepStrictEqual(
    grouped[1]?.courses.map((c) => c.code),
    ["MA101"]
  )
})
