import { z } from "zod"

/**
 * Allowed course material classifications in Gibiverse.
 */
export const COURSE_MATERIAL_TYPES = [
  "exam",
  "notes",
  "slides",
  "assignment",
  "lab",
  "other",
] as const

export const courseMaterialTypeSchema = z.enum(COURSE_MATERIAL_TYPES, {
  message: "Invalid course material type",
})

export type CourseMaterialType = z.infer<typeof courseMaterialTypeSchema>

/**
 * Allowed academic semesters in Gibiverse.
 */
export const SEMESTERS = ["1", "2", "summer"] as const

export const semesterSchema = z.union(
  [
    z.literal("1"),
    z.literal("2"),
    z.literal("summer"),
    z.literal(1).transform(() => "1" as const),
    z.literal(2).transform(() => "2" as const),
  ],
  {
    message: "Invalid semester",
  }
)

export type Semester = (typeof SEMESTERS)[number]

/**
 * File constraint constants.
 */
export const MAX_FILE_SIZE_MB = 50
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

/**
 * Academic year limits for course materials in Gibiverse.
 */
export const MIN_ACADEMIC_YEAR = 2000
export const MAX_ACADEMIC_YEAR = 2100

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const

/**
 * UI Pill labels for CourseMaterialType.
 */
export const courseMaterialTypePillLabels: Record<CourseMaterialType, string> =
  {
    exam: "Exam",
    notes: "Notes",
    slides: "Slides",
    assignment: "Assignment",
    lab: "Lab",
    other: "Other",
  }

/**
 * Select options for CourseMaterialType.
 */
export const courseMaterialTypeOptions: Array<{
  value: CourseMaterialType
  label: string
}> = [
  { value: "exam", label: "Past Exam" },
  { value: "notes", label: "Lecture Notes" },
  { value: "slides", label: "Slides / Deck" },
  { value: "assignment", label: "Assignment" },
  { value: "lab", label: "Lab Material" },
  { value: "other", label: "Other" },
]

/**
 * Academic period regex: e.g. '2026/2027 semester 1', '2026/2027 semester 2', '2026/2027 summer'.
 */
export const ACADEMIC_PERIOD_REGEX = /^\d{4}\/\d{4} (semester [12]|summer)$/

export type AcademicPeriodOption = {
  value: string
  label: string
}

/**
 * Generates curated rolling academic period choices (defaults to current academic cycle and 5 prior cycles).
 */
export function academicPeriodOptions(
  now = new Date()
): AcademicPeriodOption[] {
  const current = now.getFullYear()
  const options: AcademicPeriodOption[] = []
  for (let i = 0; i < 6; i++) {
    const startYear = current - i
    const endYear = startYear + 1
    const prefix = `${startYear}/${endYear}`
    options.push(
      { value: `${prefix} semester 1`, label: `${prefix} Semester 1` },
      { value: `${prefix} semester 2`, label: `${prefix} Semester 2` },
      { value: `${prefix} summer`, label: `${prefix} Summer` }
    )
  }
  return options
}
