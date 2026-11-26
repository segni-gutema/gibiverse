import { z } from "zod"
import { courseMaterialTypeSchema } from "./course-material.js"
import { questionSortSchema } from "./qa.js"

/**
 * Supported search domains across Gibiverse.
 */
export const SEARCH_TYPES = [
  "all",
  "course-materials",
  "questions",
  "courses",
] as const

/**
 * Schema validating the search type parameter.
 */
export const searchTypeSchema = z.enum(SEARCH_TYPES, {
  message: "Invalid search type",
})

export type SearchType = z.infer<typeof searchTypeSchema>

/**
 * Course directory sorting options supported across courses and search.
 */
export const COURSE_SORT_OPTIONS = [
  "code-asc",
  "materials-desc",
  "qa-desc",
] as const

export const courseSortSchema = z.enum(COURSE_SORT_OPTIONS)

export const searchSortSchema = z.union([questionSortSchema, courseSortSchema])

export type SearchSort = z.infer<typeof searchSortSchema>

/**
 * Schema validating search query parameters at the route boundary.
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((val) => val?.trim() ?? "")
    .default(""),
  type: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    searchTypeSchema.default("all")
  ),
  universityId: z.string().optional(),
  departmentId: z.string().optional(),
  courseId: z.string().optional(),
  courseMaterialType: courseMaterialTypeSchema.optional(),
  sort: searchSortSchema.optional(),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
