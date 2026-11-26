import type {
  Course,
  CourseDetailsData,
  CourseMaterialType,
  CourseSummary,
  Department,
  ScopedCourseMaterial,
  ScopedQuestion,
  University,
} from "@gibiverse/shared/types"

export type {
  Course,
  CourseDetailsData,
  CourseSummary,
  Department,
  ScopedCourseMaterial,
  ScopedQuestion,
  University,
}

export type PrototypeMaterial = {
  id: string
  title: string
  type: string
  academicPeriod: string
  fileSize?: string
  uploadedAt?: string
}

export type PrototypeQuestion = {
  id: string
  title: string
  votes: number
  answersCount: number
  hasAcceptedAnswer: boolean
  createdAt?: string
}

export type CourseCardData = CourseSummary & {
  materials?: PrototypeMaterial[]
  questions?: PrototypeQuestion[]
}

export type ScopedMaterialItem = ScopedCourseMaterial
export type ScopedQuestionItem = ScopedQuestion

/** Pure helper to filter materials by course material type on course details */
export function filterCourseMaterialsByType(
  materials: ScopedCourseMaterial[],
  type?: CourseMaterialType | "all" | "__all__" | string | null
): ScopedCourseMaterial[] {
  if (!type || type === "all" || type === "__all__") return materials
  return materials.filter((m) => m.courseMaterialType === type)
}

/** Pure helper to provide friendly empty state copy on course details tabs */
export function getCourseDetailsEmptyState(
  tab: "materials" | "qa",
  courseCode: string,
  selectedType?: string | null
): { title: string; description: string; actionLabel: string } {
  if (tab === "materials") {
    if (selectedType && selectedType !== "all" && selectedType !== "__all__") {
      return {
        title: `No ${selectedType} uploaded for ${courseCode} yet.`,
        description: `There are currently no ${selectedType} materials available for this course. Be the first student to upload!`,
        actionLabel: "Upload Course Material",
      }
    }
    return {
      title: `No course materials uploaded for ${courseCode} yet`,
      description:
        "Be the first student to share lecture notes, slides, assignments, or past exams for this course.",
      actionLabel: "Upload Course Material",
    }
  }
  return {
    title: `No questions asked in ${courseCode} yet`,
    description:
      "Have an academic question or need clarification on an academic question or course material? Start the community discussion.",
    actionLabel: "Ask a Question",
  }
}

export type CourseSortOption = "code-asc" | "materials-desc" | "qa-desc"

/** Pure helper: courses belonging to a university (empty when no university). */
export function filterCoursesByUniversity(
  courses: Course[],
  universityId: string | null | undefined
): Course[] {
  if (!universityId) return []
  return courses.filter((course) => course.universityId === universityId)
}

/** Pure helper: courses belonging to a department (empty when no department). */
export function filterCoursesByDepartment(
  courses: Course[],
  departmentId: string | null | undefined
): Course[] {
  if (!departmentId) return []
  return courses.filter((course) => course.departmentId === departmentId)
}

export function groupCoursesByDepartment(
  departments: Department[],
  courses: Course[]
): Array<Department & { courses: Course[] }> {
  return departments.map((department) => ({
    ...department,
    courses: courses
      .filter((course) => course.departmentId === department.id)
      .sort((a, b) => a.code.localeCompare(b.code)),
  }))
}

function isAllOrEmpty(val?: string | null): boolean {
  return !val || val === "all" || val === "__all__"
}

/** Scopes department list to selected university (or all if none/all specified). */
export function getAvailableDepartments(
  departments: Department[],
  universityId?: string | null
): Department[] {
  if (isAllOrEmpty(universityId)) {
    return departments
  }
  return departments.filter((dept) => dept.universityId === universityId)
}

/** Checks whether a department belongs to the specified university. */
export function isDepartmentCompatibleWithUniversity(
  departments: Department[],
  departmentId: string,
  universityId: string
): boolean {
  if (isAllOrEmpty(universityId)) return true
  const dept = departments.find((d) => d.id === departmentId)
  return dept ? dept.universityId === universityId : false
}

/** Pure formatter for Course Material counter */
export function formatMaterialsCount(count: number): {
  label: string
  count: number
  isZero: boolean
} {
  const isZero = count === 0
  const label = isZero
    ? "0 materials"
    : count === 1
      ? "1 material"
      : `${count} materials`
  return { label, count, isZero }
}

/** Pure formatter for Q&A counter */
export function formatQuestionsCount(count: number): {
  label: string
  count: number
  isZero: boolean
} {
  const isZero = count === 0
  const label = isZero ? "0 Q&As" : count === 1 ? "1 Q&A" : `${count} Q&As`
  return { label, count, isZero }
}

/** Pure filter & sort engine for prototype and production course grids */
export function filterPrototypeCourses(
  courses: CourseCardData[],
  options: {
    universityId?: string | null
    departmentId?: string | null
    searchQuery?: string
    sortBy?: CourseSortOption
  } = {}
): CourseCardData[] {
  const {
    universityId,
    departmentId,
    searchQuery,
    sortBy = "code-asc",
  } = options

  const cleanedQuery = searchQuery?.trim().toLowerCase()

  const filtered = courses.filter((course) => {
    // University filter
    if (!isAllOrEmpty(universityId) && course.universityId !== universityId) {
      return false
    }

    // Department filter
    if (!isAllOrEmpty(departmentId) && course.departmentId !== departmentId) {
      return false
    }

    // Text search filter (course code or course name)
    if (cleanedQuery) {
      const matchCode = course.code.toLowerCase().includes(cleanedQuery)
      const matchName = course.name.toLowerCase().includes(cleanedQuery)
      if (!matchCode && !matchName) {
        return false
      }
    }

    return true
  })

  // Sorting
  return filtered.sort((a, b) => {
    switch (sortBy) {
      case "materials-desc":
        return (
          b.materialsCount - a.materialsCount || a.code.localeCompare(b.code)
        )
      case "qa-desc":
        return (
          b.questionsCount - a.questionsCount || a.code.localeCompare(b.code)
        )
      case "code-asc":
      default:
        return a.code.localeCompare(b.code)
    }
  })
}

export const filterCourses = filterPrototypeCourses

export const PROTOTYPE_UNIVERSITIES: University[] = [
  { id: "u-aau", name: "Addis Ababa University" },
  { id: "u-astu", name: "Adama Science and Technology University" },
  { id: "u-ju", name: "Jimma University" },
]

export const PROTOTYPE_DEPARTMENTS: Department[] = [
  { id: "d-cs-aau", name: "Computer Science", universityId: "u-aau" },
  { id: "d-math-aau", name: "Mathematics", universityId: "u-aau" },
  { id: "d-phys-aau", name: "Physics", universityId: "u-aau" },
  { id: "d-se-astu", name: "Software Engineering", universityId: "u-astu" },
  { id: "d-ee-astu", name: "Electrical Engineering", universityId: "u-astu" },
  { id: "d-med-ju", name: "Medicine & Health", universityId: "u-ju" },
]

export const PROTOTYPE_COURSES: CourseCardData[] = [
  {
    id: "proto-cs101",
    code: "CS101",
    name: "Introduction to Programming",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-cs-aau",
    departmentName: "Computer Science",
    materialsCount: 18,
    questionsCount: 24,
    materials: [
      {
        id: "m-101",
        title: "Lecture 1: Basics of Control Flow & Syntax",
        type: "slides",
        academicPeriod: "2026/2027 semester 1",
        fileSize: "2.4 MB",
        uploadedAt: "2 days ago",
      },
      {
        id: "m-102",
        title: "Midterm Exam 2025 with Sample Answers",
        type: "exam",
        academicPeriod: "2025/2026 semester 1",
        fileSize: "1.1 MB",
        uploadedAt: "1 week ago",
      },
      {
        id: "m-103",
        title: "Lab Assignment 3: Recursion and Pointers",
        type: "lab",
        academicPeriod: "2026/2027 semester 1",
        fileSize: "850 KB",
        uploadedAt: "3 weeks ago",
      },
    ],
    questions: [
      {
        id: "q-101",
        title: "How does tail-call recursion optimization work in GCC?",
        votes: 12,
        answersCount: 4,
        hasAcceptedAnswer: true,
        createdAt: "3 days ago",
      },
      {
        id: "q-102",
        title:
          "Clarification on Lab 3 question regarding memory leak in linked lists",
        votes: 7,
        answersCount: 2,
        hasAcceptedAnswer: false,
        createdAt: "5 days ago",
      },
    ],
  },
  {
    id: "proto-cs201",
    code: "CS201",
    name: "Data Structures and Algorithms",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-cs-aau",
    departmentName: "Computer Science",
    materialsCount: 14,
    questionsCount: 19,
    materials: [
      {
        id: "m-201",
        title: "Graph Algorithms & Shortest Path Notes",
        type: "notes",
        academicPeriod: "2026/2027 semester 1",
        fileSize: "3.2 MB",
        uploadedAt: "yesterday",
      },
      {
        id: "m-202",
        title: "Final Exam Practice Questions 2025",
        type: "exam",
        academicPeriod: "2025/2026 semester 2",
        fileSize: "1.8 MB",
        uploadedAt: "2 weeks ago",
      },
    ],
    questions: [
      {
        id: "q-201",
        title: "Dijkstra vs A* with non-monotonic heuristics",
        votes: 18,
        answersCount: 6,
        hasAcceptedAnswer: true,
        createdAt: "4 days ago",
      },
    ],
  },
  {
    id: "proto-math101",
    code: "MATH101",
    name: "Calculus I",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-math-aau",
    departmentName: "Mathematics",
    materialsCount: 8,
    questionsCount: 0, // Edge case: 0 Q&As
    materials: [
      {
        id: "m-301",
        title: "Limits and Continuity Handouts",
        type: "notes",
        academicPeriod: "2026/2027 semester 1",
        fileSize: "1.5 MB",
        uploadedAt: "4 days ago",
      },
    ],
    questions: [],
  },
  {
    id: "proto-phys101",
    code: "PHYS101",
    name: "General Physics: Mechanics",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-phys-aau",
    departmentName: "Physics",
    materialsCount: 0, // Edge case: 0 materials
    questionsCount: 11,
    materials: [],
    questions: [
      {
        id: "q-401",
        title: "Rotational inertia for composite cylindrical shells",
        votes: 9,
        answersCount: 3,
        hasAcceptedAnswer: true,
        createdAt: "1 week ago",
      },
    ],
  },
  {
    id: "proto-ast101",
    code: "AST101",
    name: "Introduction to Astrophysics",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-phys-aau",
    departmentName: "Physics",
    materialsCount: 0, // Edge case: 0 materials and 0 Q&As
    questionsCount: 0,
    materials: [],
    questions: [],
  },
  {
    id: "proto-se301",
    code: "SE301",
    name: "Software Architecture & Design Patterns",
    universityId: "u-astu",
    universityName: "Adama Science and Technology University",
    departmentId: "d-se-astu",
    departmentName: "Software Engineering",
    materialsCount: 26,
    questionsCount: 16,
    materials: [
      {
        id: "m-501",
        title: "Microservices vs Modular Monolith Architectural Styles",
        type: "slides",
        academicPeriod: "2026/2027 semester 1",
        fileSize: "4.7 MB",
        uploadedAt: "3 days ago",
      },
    ],
    questions: [
      {
        id: "q-501",
        title: "When to choose event-sourcing over traditional CRUD logs?",
        votes: 14,
        answersCount: 5,
        hasAcceptedAnswer: true,
        createdAt: "2 days ago",
      },
    ],
  },
  {
    id: "proto-ee204",
    code: "EE204",
    name: "Signals and Systems",
    universityId: "u-astu",
    universityName: "Adama Science and Technology University",
    departmentId: "d-ee-astu",
    departmentName: "Electrical Engineering",
    materialsCount: 12,
    questionsCount: 7,
    materials: [
      {
        id: "m-601",
        title: "Fourier Transform & Frequency Domain Analysis",
        type: "notes",
        academicPeriod: "2026/2027 semester 1",
        fileSize: "2.9 MB",
        uploadedAt: "5 days ago",
      },
    ],
    questions: [
      {
        id: "q-601",
        title: "Discrete-time Fourier Transform convolution theorem step",
        votes: 5,
        answersCount: 1,
        hasAcceptedAnswer: false,
        createdAt: "6 days ago",
      },
    ],
  },
  {
    id: "proto-med201",
    code: "MED201",
    name: "Human Anatomy and Physiology",
    universityId: "u-ju",
    universityName: "Jimma University",
    departmentId: "d-med-ju",
    departmentName: "Medicine & Health",
    materialsCount: 22,
    questionsCount: 15,
    materials: [
      {
        id: "m-701",
        title: "Cardiovascular System Histology Atlas",
        type: "notes",
        academicPeriod: "2026/2027 semester 1",
        fileSize: "12.4 MB",
        uploadedAt: "1 day ago",
      },
    ],
    questions: [
      {
        id: "q-701",
        title: "Autonomic regulation of heart rate during exercise",
        votes: 10,
        answersCount: 4,
        hasAcceptedAnswer: true,
        createdAt: "3 days ago",
      },
    ],
  },
]
