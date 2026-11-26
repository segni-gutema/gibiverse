import type { CourseMaterialType, Semester } from "@gibiverse/shared/types"
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from "@gibiverse/shared/types"
import { formatBytes } from "@gibiverse/shared/utils"
import {
  validateFile as coreValidateFile,
  type FileLike,
} from "@gibiverse/shared/validation"
import {
  resolvePreviewType,
  resolveFormatLabel,
  type CourseMaterialPreviewType,
} from "../app/course-materials/presentation"

export {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  formatBytes,
  type CourseMaterialType,
  type Semester,
  type FileLike,
  type CourseMaterialPreviewType,
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  formatLabel?: string
  previewType?: CourseMaterialPreviewType
}

export function validateFile(file: FileLike): FileValidationResult {
  const coreResult = coreValidateFile(file)
  if (!coreResult.valid) {
    return coreResult
  }

  const previewType = resolvePreviewType(file.name, file.type)
  const formatLabel = resolveFormatLabel(previewType, file.name)

  return {
    valid: true,
    previewType,
    formatLabel,
  }
}

export function sanitizeTitleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, "")
  const cleaned = withoutExt.replace(/[_-]+/g, " ")
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function detectCourseMaterialType(filename: string): CourseMaterialType {
  const lower = filename.toLowerCase()
  if (/exam|midterm|final|quiz|test|paper/.test(lower)) return "exam"
  if (/slide|presentation|lecture|deck|ch\d+|session/.test(lower))
    return "slides"
  if (/note|summary|cheatsheet|study|review/.test(lower)) return "notes"
  if (/assign|homework|hw|problem|set|task|proj/.test(lower))
    return "assignment"
  if (/lab|experiment|practical|worksheet/.test(lower)) return "lab"
  return "other"
}
