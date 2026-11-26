import test from "node:test"
import assert from "node:assert/strict"
import {
  MAX_FILE_SIZE_BYTES,
  validateFile,
  sanitizeTitleFromFilename,
  detectCourseMaterialType,
} from "../lib/course-material-validation"

function makeFile(overrides: {
  name?: string
  size?: number
  type?: string
}): File {
  const name = overrides.name ?? "notes.pdf"
  const type = overrides.type ?? "application/pdf"
  const size = overrides.size ?? 1024
  const buffer = Buffer.alloc(size, 1)
  return new File([buffer], name, { type })
}

test("rejects empty files (0 bytes)", () => {
  const result = validateFile(makeFile({ size: 0, name: "empty.pdf" }))
  assert.strictEqual(result.valid, false)
  assert.match(result.error ?? "", /empty/i)
})

test("rejects files larger than 50 MB", () => {
  const result = validateFile(
    makeFile({ size: MAX_FILE_SIZE_BYTES + 1, name: "huge.pdf" })
  )
  assert.strictEqual(result.valid, false)
  assert.match(result.error ?? "", /50\s*MB/i)
})

test("rejects unsupported extensions and MIME types", () => {
  const result = validateFile(
    makeFile({
      name: "malware.exe",
      type: "application/x-msdownload",
      size: 100,
    })
  )
  assert.strictEqual(result.valid, false)
  assert.match(result.error ?? "", /unsupported/i)
})

test("accepts allowed formats within size limits", () => {
  const cases = [
    { name: "exam.pdf", type: "application/pdf" },
    {
      name: "notes.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      name: "deck.pptx",
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
    { name: "diagram.png", type: "image/png" },
    { name: "photo.jpg", type: "image/jpeg" },
    { name: "photo.jpeg", type: "image/jpeg" },
    { name: "shot.webp", type: "image/webp" },
  ] as const

  for (const fileCase of cases) {
    const result = validateFile(makeFile({ ...fileCase, size: 2048 }))
    assert.strictEqual(
      result.valid,
      true,
      `expected ${fileCase.name} to be valid`
    )
  }
})

test("resolves formatLabel and previewType for supported files", () => {
  const pdfRes = validateFile(
    makeFile({ name: "exam.pdf", type: "application/pdf" })
  )
  assert.strictEqual(pdfRes.previewType, "pdf")
  assert.strictEqual(pdfRes.formatLabel, "PDF Document")

  const docxRes = validateFile(
    makeFile({
      name: "notes.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
  )
  assert.strictEqual(docxRes.previewType, "docx")
  assert.strictEqual(docxRes.formatLabel, "Word Document")

  const imgRes = validateFile(
    makeFile({ name: "graph.png", type: "image/png" })
  )
  assert.strictEqual(imgRes.previewType, "image")
  assert.strictEqual(imgRes.formatLabel, "Image")

  const pptxRes = validateFile(
    makeFile({
      name: "slides.pptx",
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    })
  )
  assert.strictEqual(pptxRes.previewType, "download-only")
  assert.strictEqual(
    pptxRes.formatLabel,
    "PowerPoint Presentation (Download-only)"
  )
})

test("sanitizeTitleFromFilename removes extensions and capitalizes words", () => {
  assert.strictEqual(
    sanitizeTitleFromFilename("cs101_midterm_exam_2024.pdf"),
    "Cs101 Midterm Exam 2024"
  )
  assert.strictEqual(
    sanitizeTitleFromFilename("lecture-05-database-normalization.docx"),
    "Lecture 05 Database Normalization"
  )
})

test("detectCourseMaterialType detects course material type from filename keywords", () => {
  assert.strictEqual(detectCourseMaterialType("midterm-exam.pdf"), "exam")
  assert.strictEqual(detectCourseMaterialType("quiz1-practice.pdf"), "exam")
  assert.strictEqual(
    detectCourseMaterialType("lecture-slides-ch03.pptx"),
    "slides"
  )
  assert.strictEqual(
    detectCourseMaterialType("chapter-summary-notes.pdf"),
    "notes"
  )
  assert.strictEqual(
    detectCourseMaterialType("homework-1-assignment.docx"),
    "assignment"
  )
  assert.strictEqual(detectCourseMaterialType("lab02-experiment.pdf"), "lab")
  assert.strictEqual(detectCourseMaterialType("general-document.pdf"), "other")
})
