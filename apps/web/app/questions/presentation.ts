import { postAnswerSchema, type QuestionSort } from "@gibiverse/shared/types"

export type { QuestionSort }

export type QuestionCatalogFilters = {
  courseId: string | null
  universityId: string | null
  departmentId?: string | null
  sort: QuestionSort
}

export type CatalogQuestion = {
  id: string
  title: string
  body: string
  createdAt: string
  courseId: string
  courseCode: string
  courseName: string
  studentId: string
  studentName: string
  voteScore: number
  answerCount: number
  studentVote?: number | null
}

export type QuestionCatalogEmptyState = {
  title: string
  description: string
}

export function hasActiveQuestionFilters(
  filters: QuestionCatalogFilters
): boolean {
  return Boolean(
    filters.courseId || filters.universityId || filters.departmentId
  )
}

export function questionCatalogEmptyState(
  filters: QuestionCatalogFilters
): QuestionCatalogEmptyState {
  if (hasActiveQuestionFilters(filters)) {
    return {
      title: "No questions match these filters",
      description:
        "Try clearing or adjusting the university or course filters.",
    }
  }

  return {
    title: "No questions yet",
    description: "Be the first to ask an academic question for your courses.",
  }
}

export function buildQuestionsQuery(filters: QuestionCatalogFilters): string {
  const params = new URLSearchParams()
  if (filters.courseId) params.set("courseId", filters.courseId)
  if (filters.universityId) params.set("universityId", filters.universityId)
  if (filters.departmentId) params.set("departmentId", filters.departmentId)
  if (filters.sort && filters.sort !== "newest") {
    params.set("sort", filters.sort)
  }
  const qs = params.toString()
  return qs ? `/api/questions?${qs}` : "/api/questions"
}

export interface AnswerItem {
  id: string
  body: string
  questionId: string
  studentId: string
  studentName: string
  voteScore: number
  isAccepted: boolean
  studentVote?: number | null
  createdAt: string
  updatedAt: string
}

export interface QuestionDetail {
  id: string
  title: string
  body: string
  courseId: string
  courseCode: string
  courseName: string
  studentId: string
  studentName: string
  voteScore: number
  answerCount: number
  acceptedAnswerId: string | null
  studentVote?: number | null
  createdAt: string
  updatedAt: string
  answers: AnswerItem[]
}

export function canAcceptAnswer(
  questionStudentId?: string | null,
  currentStudentId?: string | null
): boolean {
  if (!questionStudentId || !currentStudentId) {
    return false
  }
  return questionStudentId === currentStudentId
}

export function isAnswerAccepted(
  answerId: string | null | undefined,
  acceptedAnswerId: string | null | undefined
): boolean {
  if (!acceptedAnswerId || !answerId) {
    return false
  }
  return acceptedAnswerId === answerId
}

export function validateAnswerSubmission(body: string): {
  valid: boolean
  error?: string
  body?: string
} {
  const result = postAnswerSchema.safeParse({ body })
  if (!result.success) {
    return {
      valid: false,
      error: result.error.issues[0]?.message ?? "Answer body cannot be empty",
    }
  }
  return {
    valid: true,
    body: result.data.body,
  }
}

export const ASK_QUESTION_PATH = "/questions/ask"

export function getAskSignInHref(
  callbackPath: string = ASK_QUESTION_PATH
): string {
  const callbackUrl = encodeURIComponent(callbackPath)
  return `/sign-in?callbackUrl=${callbackUrl}`
}

export function formatDetailDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
