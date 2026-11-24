import test from "node:test"
import assert from "node:assert/strict"
import {
  filterCourses,
  filterPrototypeCourses,
  filterCourseMaterialsByType,
  getCourseDetailsEmptyState,
  getAvailableDepartments,
  isDepartmentCompatibleWithUniversity,
  formatMaterialsCount,
  formatQuestionsCount,
  PROTOTYPE_COURSES,
  PROTOTYPE_UNIVERSITIES,
  PROTOTYPE_DEPARTMENTS,
  type CourseCardData,
  type CourseSummary,
  type ScopedMaterialItem,
  type Department,
} from "../app/courses/presentation.js"

const SAMPLE_COURSES: CourseCardData[] = [
  {
    id: "c-cs101",
    name: "Introduction to Computer Science",
    code: "CS101",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-cs",
    departmentName: "Computer Science",
    materialsCount: 15,
    questionsCount: 22,
  },
  {
    id: "c-cs201",
    name: "Data Structures and Algorithms",
    code: "CS201",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-cs",
    departmentName: "Computer Science",
    materialsCount: 0, // Edge case: 0 materials
    questionsCount: 8,
  },
  {
    id: "c-math101",
    name: "Calculus I",
    code: "MATH101",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-math",
    departmentName: "Mathematics",
    materialsCount: 9,
    questionsCount: 0, // Edge case: 0 Q&As
  },
  {
    id: "c-ast101",
    name: "Introduction to Astronomy",
    code: "AST101",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-phys",
    departmentName: "Physics",
    materialsCount: 0, // Edge case: 0 materials and 0 Q&As
    questionsCount: 0,
  },
  {
    id: "c-se301",
    name: "Software Architecture",
    code: "SE301",
    universityId: "u-astu",
    universityName: "Adama Science and Technology University",
    departmentId: "d-se",
    departmentName: "Software Engineering",
    materialsCount: 28,
    questionsCount: 14,
  },
]

const SAMPLE_DEPARTMENTS: Department[] = [
  { id: "d-cs", name: "Computer Science", universityId: "u-aau" },
  { id: "d-math", name: "Mathematics", universityId: "u-aau" },
  { id: "d-phys", name: "Physics", universityId: "u-aau" },
  { id: "d-se", name: "Software Engineering", universityId: "u-astu" },
]

test("filterPrototypeCourses filters by universityId", () => {
  const result = filterPrototypeCourses(SAMPLE_COURSES, {
    universityId: "u-astu",
  })
  assert.equal(result.length, 1)
  assert.equal(result[0]?.code, "SE301")
})

test("filterPrototypeCourses returns all courses when universityId is empty or all", () => {
  const resultAll = filterPrototypeCourses(SAMPLE_COURSES, {
    universityId: "__all__",
  })
  assert.equal(resultAll.length, SAMPLE_COURSES.length)

  const resultNull = filterPrototypeCourses(SAMPLE_COURSES, {
    universityId: null,
  })
  assert.equal(resultNull.length, SAMPLE_COURSES.length)
})

test("filterPrototypeCourses filters by departmentId", () => {
  const result = filterPrototypeCourses(SAMPLE_COURSES, {
    departmentId: "d-math",
  })
  assert.equal(result.length, 1)
  assert.equal(result[0]?.code, "MATH101")
})

test("filterPrototypeCourses filters case-insensitively by search query in code or name", () => {
  const byCode = filterPrototypeCourses(SAMPLE_COURSES, {
    searchQuery: "cs2",
  })
  assert.equal(byCode.length, 1)
  assert.equal(byCode[0]?.code, "CS201")

  const byName = filterPrototypeCourses(SAMPLE_COURSES, {
    searchQuery: "structures",
  })
  assert.equal(byName.length, 1)
  assert.equal(byName[0]?.code, "CS201")

  const trimmed = filterPrototypeCourses(SAMPLE_COURSES, {
    searchQuery: "  calculus  ",
  })
  assert.equal(trimmed.length, 1)
  assert.equal(trimmed[0]?.code, "MATH101")
})

test("filterPrototypeCourses sorts by code-asc", () => {
  const result = filterPrototypeCourses(SAMPLE_COURSES, {
    sortBy: "code-asc",
  })
  assert.deepEqual(
    result.map((c) => c.code),
    ["AST101", "CS101", "CS201", "MATH101", "SE301"]
  )
})

test("filterPrototypeCourses sorts by materials-desc", () => {
  const result = filterPrototypeCourses(SAMPLE_COURSES, {
    sortBy: "materials-desc",
  })
  assert.deepEqual(
    result.map((c) => c.code),
    ["SE301", "CS101", "MATH101", "AST101", "CS201"] // 28, 15, 9, 0 (AST), 0 (CS)
  )
})

test("filterPrototypeCourses sorts by qa-desc", () => {
  const result = filterPrototypeCourses(SAMPLE_COURSES, {
    sortBy: "qa-desc",
  })
  assert.deepEqual(
    result.map((c) => c.code),
    ["CS101", "SE301", "CS201", "AST101", "MATH101"] // 22, 14, 8, 0 (AST), 0 (MATH)
  )
})

test("getAvailableDepartments scopes departments to the selected university", () => {
  const aauDepts = getAvailableDepartments(SAMPLE_DEPARTMENTS, "u-aau")
  assert.equal(aauDepts.length, 3)
  assert.deepEqual(
    aauDepts.map((d) => d.id),
    ["d-cs", "d-math", "d-phys"]
  )

  const astuDepts = getAvailableDepartments(SAMPLE_DEPARTMENTS, "u-astu")
  assert.equal(astuDepts.length, 1)
  assert.equal(astuDepts[0]?.id, "d-se")

  const allDepts = getAvailableDepartments(SAMPLE_DEPARTMENTS, "__all__")
  assert.equal(allDepts.length, SAMPLE_DEPARTMENTS.length)
})

test("isDepartmentCompatibleWithUniversity checks department university ownership", () => {
  assert.equal(
    isDepartmentCompatibleWithUniversity(SAMPLE_DEPARTMENTS, "d-cs", "u-aau"),
    true
  )
  assert.equal(
    isDepartmentCompatibleWithUniversity(SAMPLE_DEPARTMENTS, "d-se", "u-aau"),
    false
  )
  assert.equal(
    isDepartmentCompatibleWithUniversity(SAMPLE_DEPARTMENTS, "d-cs", "__all__"),
    true
  )
})

test("formatMaterialsCount produces correct labels and zero flag for edge cases", () => {
  assert.deepEqual(formatMaterialsCount(0), {
    label: "0 materials",
    count: 0,
    isZero: true,
  })
  assert.deepEqual(formatMaterialsCount(1), {
    label: "1 material",
    count: 1,
    isZero: false,
  })
  assert.deepEqual(formatMaterialsCount(14), {
    label: "14 materials",
    count: 14,
    isZero: false,
  })
})

test("formatQuestionsCount produces correct labels and zero flag for edge cases", () => {
  assert.deepEqual(formatQuestionsCount(0), {
    label: "0 Q&As",
    count: 0,
    isZero: true,
  })
  assert.deepEqual(formatQuestionsCount(1), {
    label: "1 Q&A",
    count: 1,
    isZero: false,
  })
  assert.deepEqual(formatQuestionsCount(8), {
    label: "8 Q&As",
    count: 8,
    isZero: false,
  })
})

test("PROTOTYPE_COURSES dataset covers realistic data and all required edge cases", () => {
  assert.ok(PROTOTYPE_COURSES.length >= 6, "Has sufficient course mock items")
  assert.ok(PROTOTYPE_UNIVERSITIES.length >= 2, "Has multiple universities")
  assert.ok(PROTOTYPE_DEPARTMENTS.length >= 4, "Has multiple departments")

  // Edge cases verification:
  const hasZeroMaterials = PROTOTYPE_COURSES.some(
    (c) => c.materialsCount === 0 && c.questionsCount > 0
  )
  const hasZeroQuestions = PROTOTYPE_COURSES.some(
    (c) => c.questionsCount === 0 && c.materialsCount > 0
  )
  const hasZeroBoth = PROTOTYPE_COURSES.some(
    (c) => c.materialsCount === 0 && c.questionsCount === 0
  )
  const hasHighActivity = PROTOTYPE_COURSES.some(
    (c) => c.materialsCount >= 10 && c.questionsCount >= 10
  )

  assert.ok(hasZeroMaterials, "Mock data has course with 0 materials")
  assert.ok(hasZeroQuestions, "Mock data has course with 0 Q&As")
  assert.ok(hasZeroBoth, "Mock data has course with 0 materials and 0 Q&As")
  assert.ok(hasHighActivity, "Mock data has course with high activity")

  // Details verification:
  const withDetails = PROTOTYPE_COURSES.filter(
    (c) => (c.materials?.length ?? 0) > 0 && (c.questions?.length ?? 0) > 0
  )
  assert.ok(withDetails.length > 0, "Mock data has courses with detailed materials and questions for preview tabs")
})

test("filterCourses processes live CourseSummary catalog with cascading filters, sort, and search", () => {
  const liveCourses: CourseSummary[] = [
    {
      id: "live-1",
      name: "Compilers",
      code: "CS401",
      universityId: "uni-1",
      universityName: "University One",
      departmentId: "dept-cs",
      departmentName: "Computer Science",
      materialsCount: 5,
      questionsCount: 12,
    },
    {
      id: "live-2",
      name: "Operating Systems",
      code: "CS301",
      universityId: "uni-1",
      universityName: "University One",
      departmentId: "dept-cs",
      departmentName: "Computer Science",
      materialsCount: 20,
      questionsCount: 4,
    },
    {
      id: "live-3",
      name: "Linear Algebra",
      code: "MATH201",
      universityId: "uni-2",
      universityName: "University Two",
      departmentId: "dept-math",
      departmentName: "Mathematics",
      materialsCount: 1,
      questionsCount: 0,
    },
  ]

  // Filter by university
  const filteredUni = filterCourses(liveCourses, { universityId: "uni-1" })
  assert.equal(filteredUni.length, 2)
  assert.deepEqual(filteredUni.map((c) => c.code).sort(), ["CS301", "CS401"])

  // Filter by department
  const filteredDept = filterCourses(liveCourses, { departmentId: "dept-math" })
  assert.equal(filteredDept.length, 1)
  assert.equal(filteredDept[0]?.code, "MATH201")

  // Live text search by code and name
  const searchedCode = filterCourses(liveCourses, { searchQuery: "cs3" })
  assert.equal(searchedCode.length, 1)
  assert.equal(searchedCode[0]?.code, "CS301")

  const searchedName = filterCourses(liveCourses, { searchQuery: "linear" })
  assert.equal(searchedName.length, 1)
  assert.equal(searchedName[0]?.code, "MATH201")

  // Sorting
  const sortedMaterials = filterCourses(liveCourses, { sortBy: "materials-desc" })
  assert.equal(sortedMaterials[0]?.code, "CS301")
  assert.equal(sortedMaterials[0]?.materialsCount, 20)

  const sortedQA = filterCourses(liveCourses, { sortBy: "qa-desc" })
  assert.equal(sortedQA[0]?.code, "CS401")
  assert.equal(sortedQA[0]?.questionsCount, 12)
})

test("filterCourseMaterialsByType filters materials by type and handles all", () => {
  const materials: ScopedMaterialItem[] = [
    {
      id: "m1",
      title: "Lecture Notes 1",
      courseMaterialType: "notes",
      academicPeriod: "2026/2027 semester 1",
      fileName: "notes.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      createdAt: new Date(),
    },
    {
      id: "m2",
      title: "Slide Deck 1",
      courseMaterialType: "slides",
      academicPeriod: "2026/2027 semester 1",
      fileName: "slides.pdf",
      fileSize: 2048,
      mimeType: "application/pdf",
      createdAt: new Date(),
    },
    {
      id: "m3",
      title: "Midterm Exam 2025",
      courseMaterialType: "exam",
      academicPeriod: "2025/2026 semester 1",
      fileName: "midterm.pdf",
      fileSize: 4096,
      mimeType: "application/pdf",
      createdAt: new Date(),
    },
  ]

  assert.equal(filterCourseMaterialsByType(materials, "notes").length, 1)
  assert.equal(filterCourseMaterialsByType(materials, "notes")[0]?.id, "m1")
  assert.equal(filterCourseMaterialsByType(materials, "slides").length, 1)
  assert.equal(filterCourseMaterialsByType(materials, "slides")[0]?.id, "m2")
  assert.equal(filterCourseMaterialsByType(materials, "exam").length, 1)
  assert.equal(filterCourseMaterialsByType(materials, "exam")[0]?.id, "m3")
  assert.equal(filterCourseMaterialsByType(materials, "all").length, 3)
  assert.equal(filterCourseMaterialsByType(materials, null).length, 3)
})

test("getCourseDetailsEmptyState provides contextual copy per tab and filter", () => {
  const materialsEmpty = getCourseDetailsEmptyState("materials", "CS201")
  assert.ok(materialsEmpty.title.includes("CS201"))
  assert.ok(materialsEmpty.description.includes("lecture notes"))
  assert.equal(materialsEmpty.actionLabel, "Upload Course Material")

  const filterEmpty = getCourseDetailsEmptyState("materials", "CS201", "exam")
  assert.equal(filterEmpty.title, "No exam uploaded for CS201 yet.")
  assert.ok(filterEmpty.description.includes("exam"))

  const qaEmpty = getCourseDetailsEmptyState("qa", "CS201")
  assert.ok(qaEmpty.title.includes("CS201"))
  assert.ok(qaEmpty.description.includes("clarification"))
  assert.ok(!qaEmpty.description.includes("topic"), "Should not use prohibited word topic")
  assert.equal(qaEmpty.actionLabel, "Ask a Question")
})
