import {
  COURSE_MATERIAL_TYPES,
  type CourseMaterialType,
} from "@gibiverse/shared/types"
import { academicPeriodSchema } from "@gibiverse/shared/validation"

export {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  COURSE_MATERIAL_TYPES,
  type CourseMaterialType,
} from "@gibiverse/shared/types"

export {
  validateFile,
  validateFile as validateUploadFile,
  type FileLike,
  academicPeriodSchema,
} from "@gibiverse/shared/validation"

export { formatBytes } from "@gibiverse/shared/utils"

export function isCourseMaterialType(
  value: string
): value is CourseMaterialType {
  return (COURSE_MATERIAL_TYPES as readonly string[]).includes(value)
}

export function isAcademicPeriod(value: string): boolean {
  return academicPeriodSchema.safeParse(value).success
}
