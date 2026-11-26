import {
  formatAcademicPeriod,
  formatRelativeUploadDate,
} from "@/lib/formatters"
import type { CourseMaterialType, Semester } from "@gibiverse/shared/types"

export { formatAcademicPeriod, formatRelativeUploadDate }

export type CourseMaterialFilters = {
  courseMaterialType?: CourseMaterialType | null
  universityId: string | null
  departmentId?: string | null
  courseId: string | null
}

export type CourseMaterialEmptyState = {
  title: string
  description: string
}

export type CatalogCourseMaterial = {
  id: string
  title: string
  courseMaterialType: CourseMaterialType | string
  academicPeriod: string
  createdAt: string
  courseId: string
  courseCode: string
  courseName: string
  universityId?: string
  departmentId?: string
  thumbnailPath?: string | null
}

export function hasActiveCatalogFilters(
  filters: CourseMaterialFilters
): boolean {
  return Boolean(
    filters.courseMaterialType ||
    filters.universityId ||
    filters.departmentId ||
    filters.courseId
  )
}

export function catalogEmptyState(
  filters: CourseMaterialFilters
): CourseMaterialEmptyState {
  if (hasActiveCatalogFilters(filters)) {
    return {
      title: "No course materials match these filters",
      description:
        "Try clearing or adjusting the course material type, university, or course filters.",
    }
  }

  return {
    title: "No course materials yet",
    description:
      "Be the first to upload past exams, notes, or slides for your courses.",
  }
}

export function buildCourseMaterialsQuery(
  filters: CourseMaterialFilters
): string {
  const params = new URLSearchParams()
  if (filters.courseMaterialType) {
    params.set("courseMaterialType", filters.courseMaterialType)
  }
  if (filters.universityId) params.set("universityId", filters.universityId)
  if (filters.departmentId) params.set("departmentId", filters.departmentId)
  if (filters.courseId) params.set("courseId", filters.courseId)
  const qs = params.toString()
  return qs ? `/api/course-materials?${qs}` : "/api/course-materials"
}

export type CourseMaterialDetail = {
  id: string
  title: string
  courseMaterialType: CourseMaterialType
  academicPeriod: string
  fileName: string
  mimeType: string
  fileSize: number
  createdAt: string
  courseId: string
  courseCode: string
  courseName: string
  universityId?: string
  studentId: string
  studentName: string
}

export type CourseMaterialPreviewType =
  "pdf" | "docx" | "image" | "download-only"

export const UPLOAD_COURSE_MATERIAL_PATH = "/course-materials/upload"

export function getUploadSignInHref(
  callbackPath: string = UPLOAD_COURSE_MATERIAL_PATH
): string {
  const callbackUrl = encodeURIComponent(callbackPath)
  return `/sign-in?callbackUrl=${callbackUrl}`
}

export function courseMaterialPreviewUrl(id: string): string {
  return `/api/course-materials/${id}/preview`
}

export function courseMaterialDownloadUrl(id: string): string {
  return `/api/course-materials/${id}/download`
}

export function resolvePreviewType(
  fileName: string,
  mimeType: string
): CourseMaterialPreviewType {
  const name = fileName.toLowerCase()
  const extension = "." + (name.split(".").pop() ?? "")
  if (extension === ".pdf" || mimeType === "application/pdf") {
    return "pdf"
  }
  if (
    extension === ".docx" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx"
  }
  if (
    [".png", ".jpg", ".jpeg", ".webp"].includes(extension) ||
    mimeType.startsWith("image/")
  ) {
    return "image"
  }
  return "download-only"
}

export function resolveFormatLabel(
  previewType: CourseMaterialPreviewType,
  fileName: string
): string {
  const name = fileName.toLowerCase()
  const extension = "." + (name.split(".").pop() ?? "")
  if (previewType === "pdf") return "PDF Document"
  if (previewType === "docx") return "Word Document"
  if (previewType === "image") return "Image"
  if (extension === ".pptx") return "PowerPoint Presentation (Download-only)"
  return "Document"
}
