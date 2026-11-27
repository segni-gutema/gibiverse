import { z } from "zod"

/**
 * Summary view of a question as returned by the API list endpoint.
 * Contains only the fields needed for catalog/list rendering.
 */
export type QuestionSummary = {
  id: string
  title: string
  body: string
  createdAt: string | Date
  courseId: string
  courseCode: string
  courseName: string
  studentId: string
  studentName: string
  voteScore: number
  answerCount: number
  studentVote: number | null
}

/**
 * Question sorting options supported by Gibiverse.
 */
export const QUESTION_SORT_OPTIONS = [
  "newest",
  "most_voted",
  "unanswered",
] as const

export const questionSortSchema = z.enum(QUESTION_SORT_OPTIONS)
export type QuestionSort = z.infer<typeof questionSortSchema>

/**
 * Validated question creation payload received by the API.
 */
export const askQuestionSchema = z.object({
  courseId: z.string().trim().min(1, "Course is required"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title is too long"),
  body: z.string().trim().min(1, "Question body is required"),
})
export type AskQuestionPayload = z.infer<typeof askQuestionSchema>

/**
 * Validated answer submission payload received by the API.
 */
export const postAnswerSchema = z.object({
  body: z.string().trim().min(1, "Answer body cannot be empty"),
})
export type PostAnswerPayload = z.infer<typeof postAnswerSchema>

/**
 * Validated accept answer payload received by the API.
 */
export const acceptAnswerSchema = z.object({
  answerId: z
    .string()
    .trim()
    .min(1, "Answer ID must be valid")
    .nullable()
    .optional()
    .default(null),
})
export type AcceptAnswerPayload = z.infer<typeof acceptAnswerSchema>
