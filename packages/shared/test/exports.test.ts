import test from "node:test"
import assert from "node:assert/strict"

test("subpath export ./types resolves and provides type definitions", async () => {
  const typesModule = await import("@gibiverse/shared/types")
  assert.ok(typesModule, "types module should resolve")
  assert.equal(typeof typesModule, "object")
  assert.ok(
    typesModule.voteTargetTypeSchema,
    "voteTargetTypeSchema should be exported"
  )
  assert.ok(typesModule.voteValueSchema, "voteValueSchema should be exported")
  assert.ok(
    typesModule.currentVoteSchema,
    "currentVoteSchema should be exported"
  )
  assert.ok(typesModule.castVoteSchema, "castVoteSchema should be exported")
  assert.ok(
    typesModule.questionSortSchema,
    "questionSortSchema should be exported"
  )
  assert.ok(
    typesModule.askQuestionSchema,
    "askQuestionSchema should be exported"
  )
  assert.ok(typesModule.postAnswerSchema, "postAnswerSchema should be exported")
  assert.ok(
    typesModule.acceptAnswerSchema,
    "acceptAnswerSchema should be exported"
  )
  assert.ok(
    typesModule.courseMaterialTypeSchema,
    "courseMaterialTypeSchema should be exported"
  )
  assert.ok(
    typesModule.academicPeriodOptions,
    "academicPeriodOptions should be exported"
  )
  assert.ok(
    typesModule.courseMaterialTypeOptions,
    "courseMaterialTypeOptions should be exported"
  )
  assert.ok(
    typesModule.courseMaterialTypePillLabels,
    "courseMaterialTypePillLabels should be exported"
  )
  assert.equal(
    // @ts-expect-error resourceTypeSchema should not exist
    typesModule.resourceTypeSchema,
    undefined,
    "resourceTypeSchema should not be exported (clean cut)"
  )
  assert.equal(typesModule.MAX_FILE_SIZE_MB, 50)
  assert.equal(typesModule.MAX_FILE_SIZE_BYTES, 50 * 1024 * 1024)
  assert.ok(typesModule.ALLOWED_EXTENSIONS)
  assert.ok(typesModule.ALLOWED_MIME_TYPES)
})

test("subpath export ./validation resolves and provides validation schemas", async () => {
  const validationModule = await import("@gibiverse/shared/validation")
  assert.ok(validationModule, "validation module should resolve")
  assert.ok(
    validationModule.academicPeriodSchema,
    "academicPeriodSchema should be exported"
  )
  assert.ok(
    validationModule.semesterSchema,
    "semesterSchema should be exported"
  )
  assert.ok(
    validationModule.voteTargetTypeSchema,
    "voteTargetTypeSchema should be exported"
  )
  assert.ok(
    validationModule.voteValueSchema,
    "voteValueSchema should be exported"
  )
  assert.ok(
    validationModule.currentVoteSchema,
    "currentVoteSchema should be exported"
  )
  assert.ok(
    validationModule.castVoteSchema,
    "castVoteSchema should be exported"
  )
  assert.ok(
    validationModule.questionSortSchema,
    "questionSortSchema should be exported"
  )
  assert.ok(
    validationModule.askQuestionSchema,
    "askQuestionSchema should be exported"
  )
  assert.ok(
    validationModule.postAnswerSchema,
    "postAnswerSchema should be exported"
  )
  assert.ok(
    validationModule.acceptAnswerSchema,
    "acceptAnswerSchema should be exported"
  )
  assert.ok(
    validationModule.courseMaterialTypeSchema,
    "courseMaterialTypeSchema should be exported"
  )
  assert.ok(
    validationModule.listCourseMaterialsQuerySchema,
    "listCourseMaterialsQuerySchema should be exported"
  )
  assert.ok(
    validationModule.uploadCourseMaterialSchema,
    "uploadCourseMaterialSchema should be exported"
  )
  assert.equal(
    // @ts-expect-error uploadResourceSchema should not exist
    validationModule.uploadResourceSchema,
    undefined,
    "uploadResourceSchema should not be exported (clean cut)"
  )

  // Verify runtime schema behavior
  const valid = validationModule.academicPeriodSchema.safeParse(
    "2026/2027 semester 1"
  )
  assert.equal(valid.success, true)
  const invalid = validationModule.academicPeriodSchema.safeParse("invalid")
  assert.equal(invalid.success, false)
})

test("subpath export ./utils resolves and provides domain utilities", async () => {
  const utilsModule = await import("@gibiverse/shared/utils")
  assert.ok(utilsModule, "utils module should resolve")
  assert.equal(typeof utilsModule.formatAcademicPeriod, "function")
  assert.equal(typeof utilsModule.calculateVoteTransition, "function")
  assert.equal(typeof utilsModule.formatBytes, "function")

  assert.equal(
    utilsModule.formatAcademicPeriod("2026/2027 semester 1"),
    "2026/2027 Semester 1"
  )
  assert.equal(
    utilsModule.formatAcademicPeriod("2026/2027 summer"),
    "2026/2027 Summer"
  )

  // Test calculateVoteTransition
  assert.deepEqual(utilsModule.calculateVoteTransition(null, 1), {
    nextVote: 1,
    scoreDelta: 1,
  })
})
