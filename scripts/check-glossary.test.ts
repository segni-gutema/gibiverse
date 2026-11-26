import test from "node:test"
import assert from "node:assert/strict"
import { findGlossaryViolations } from "./check-glossary.js"

test("detects _Avoid_ domain terms from GLOSSARY.md", () => {
  const sample = [
    'const label = "Browse Resources"',
    "const totalResources = 5",
    'const type = "resourceType"',
    'const org = "Select your school or college"',
    'const dept = "Engineering faculty"',
    'const ans = "Best answer and solution"',
    'const qa = "Start a discussion thread"',
    'const vote = "Add a reaction or rating"',
  ].join("\n")

  const violations = findGlossaryViolations(sample, "apps/web/app/example.tsx")
  const avoided = violations.map((v) => v.avoid)

  assert.ok(avoided.some((a) => /resource/i.test(a)))
  assert.ok(avoided.some((a) => /school/i.test(a)))
  assert.ok(avoided.some((a) => /college/i.test(a)))
  assert.ok(avoided.some((a) => /faculty/i.test(a)))
  assert.ok(avoided.some((a) => /best answer/i.test(a)))
  assert.ok(avoided.some((a) => /solution/i.test(a)))
  assert.ok(avoided.some((a) => /discussion thread/i.test(a)))
  assert.ok(avoided.some((a) => /reaction/i.test(a)))
  assert.ok(avoided.some((a) => /rating/i.test(a)))
})

test("ignores comments, imports, and canonical glossary terms", () => {
  const sample = [
    "// Legacy resource comment should be ignored",
    "/* Another school/faculty block comment */",
    "* JSDoc resourceType comment",
    'import { UploadResourceWizard } from "./wizard"',
    'export type { SearchResultResource } from "./types"',
    'const title = "Course Materials for CS201 at University"',
    'const desc = "Ask a question, post an answer, or cast a vote."',
  ].join("\n")

  const violations = findGlossaryViolations(sample, "apps/web/app/clean.tsx")
  assert.equal(violations.length, 0)
})
