import test from "node:test"
import assert from "node:assert/strict"
import {
  resolvePreviewType,
  courseMaterialDownloadUrl,
  courseMaterialPreviewUrl,
} from "../app/course-materials/presentation.js"

test("courseMaterialPreviewUrl and courseMaterialDownloadUrl point at streaming endpoints", () => {
  assert.strictEqual(
    courseMaterialPreviewUrl("abc"),
    "/api/course-materials/abc/preview"
  )
  assert.strictEqual(
    courseMaterialDownloadUrl("abc"),
    "/api/course-materials/abc/download"
  )
})

test("resolvePreviewType maps MIME and extensions to preview modes", () => {
  assert.strictEqual(resolvePreviewType("notes.pdf", "application/pdf"), "pdf")
  assert.strictEqual(
    resolvePreviewType(
      "notes.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ),
    "docx"
  )
  assert.strictEqual(resolvePreviewType("figure.png", "image/png"), "image")
  assert.strictEqual(
    resolvePreviewType(
      "deck.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ),
    "download-only"
  )
})
