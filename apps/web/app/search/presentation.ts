import type {
  SearchType,
  SearchSort,
  CourseMaterialType,
} from "@gibiverse/shared/types"

export type { SearchType, SearchSort }
export type SearchTab = SearchType

export const ALL_TAB_PREVIEW_LIMIT = 6

export type SearchResultCourseMaterial = {
  id: string
  title: string
  courseMaterialType: string
  academicPeriod: string
  createdAt: string
  courseId: string
  courseCode: string
  courseName: string
  departmentId: string
  universityId?: string
  universityName?: string
  thumbnailPath?: string | null
}

export type SearchResultQuestion = {
  id: string
  title: string
  body: string
  createdAt: string
  courseId: string
  courseCode: string
  courseName: string
  universityId?: string
  universityName?: string
  studentId: string
  studentName: string
  voteScore: number
  answerCount: number
  userVote?: number | null
}

export type SearchResultCourse = {
  id: string
  name: string
  code: string
  universityId: string
  universityName: string
  departmentId: string
  departmentName: string
  materialsCount: number
  questionsCount: number
}

export type SearchCounts = {
  all: number
  courseMaterials: number
  questions: number
  courses: number
}

export type SearchResponse = {
  query: string
  type: SearchType
  counts: SearchCounts
  courseMaterials: SearchResultCourseMaterial[]
  questions: SearchResultQuestion[]
  courses: SearchResultCourse[]
}

export type SearchFilterParams = {
  universityId?: string | null
  departmentId?: string | null
  courseId?: string | null
  courseMaterialType?: CourseMaterialType | null
  sort?: SearchSort | null
}

export function emptySearchResponse(type: SearchType = "all"): SearchResponse {
  return {
    query: "",
    type,
    counts: { all: 0, courseMaterials: 0, questions: 0, courses: 0 },
    courseMaterials: [],
    questions: [],
    courses: [],
  }
}

function appendSearchParams(
  params: URLSearchParams,
  type?: SearchType,
  filters?: SearchFilterParams
) {
  if (type && type !== "all") {
    params.set("type", type)
  }
  if (filters?.universityId) params.set("universityId", filters.universityId)
  if (filters?.departmentId) params.set("departmentId", filters.departmentId)
  if (filters?.courseId) params.set("courseId", filters.courseId)
  if (filters?.courseMaterialType) {
    params.set("courseMaterialType", filters.courseMaterialType)
  }
  if (filters?.sort) {
    params.set("sort", filters.sort)
  }
}

export function buildSearchQuery(
  query: string,
  type?: SearchType,
  filters?: SearchFilterParams
): string {
  const trimmed = query.trim()
  if (!trimmed) {
    return "/api/search"
  }

  const params = new URLSearchParams()
  params.set("q", trimmed)
  appendSearchParams(params, type, filters)

  return `/api/search?${params.toString()}`
}

export function buildSearchPageUrl(
  query: string,
  type?: SearchType,
  filters?: SearchFilterParams
): string {
  const trimmed = query.trim()
  const params = new URLSearchParams()

  if (trimmed) {
    params.set("q", trimmed)
  }
  appendSearchParams(params, type, filters)

  const qs = params.toString()
  return qs ? `/search?${qs}` : "/search"
}

export function getSearchEmptyState(
  query: string,
  type: SearchType,
  hasActiveFilters = false
): { title: string; description: string } {
  const trimmed = query.trim()
  if (!trimmed) {
    return {
      title: "Search Gibiverse",
      description:
        "Find course materials, questions, and courses by keyword, title, or course code.",
    }
  }

  if (hasActiveFilters) {
    if (type === "course-materials") {
      return {
        title: "No course materials match these filters",
        description:
          "Try clearing or adjusting the course material type, university, or course filters.",
      }
    }
    if (type === "questions") {
      return {
        title: "No questions match these filters",
        description:
          "Try clearing or adjusting the university or course filters.",
      }
    }
    if (type === "courses") {
      return {
        title: "No courses match these filters",
        description:
          "Try resetting the filters or choosing another university or department.",
      }
    }
  }

  if (type === "course-materials") {
    return {
      title: "No course materials found",
      description: `We couldn't find any course materials matching "${trimmed}". Try checking for typos or searching for a course code.`,
    }
  }

  if (type === "questions") {
    return {
      title: "No questions found",
      description: `We couldn't find any questions matching "${trimmed}". Try checking for typos or searching for a course code.`,
    }
  }

  if (type === "courses") {
    return {
      title: "No courses found",
      description: `We couldn't find any courses matching "${trimmed}". Try searching by course code (e.g. CS101) or title.`,
    }
  }

  return {
    title: "No results found",
    description: `We couldn't find any results matching "${trimmed}". Try checking for typos or searching for a course code.`,
  }
}
