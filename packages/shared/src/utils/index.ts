/**
 * Shared domain utilities foundation for Gibiverse.
 */
export function formatAcademicPeriod(period: string): string {
  if (!period) return ""
  return period
    .replace(/\bsemester (\d)\b/i, "Semester $1")
    .replace(/\bsummer\b/i, "Summer")
}

export * from "./vote.js"
export * from "./course-material.js"
