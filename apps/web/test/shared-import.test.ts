import test from "node:test"
import assert from "node:assert/strict"
import { formatAcademicPeriod } from "@gibiverse/shared/utils"
import {
  academicPeriodSchema,
  searchTypeSchema,
} from "@gibiverse/shared/validation"
import type { AcademicPeriod, SearchType } from "@gibiverse/shared/types"

test("apps/web can import and use @gibiverse/shared subpaths", () => {
  const period: AcademicPeriod = "2026/2027 semester 2"
  const parsed = academicPeriodSchema.parse(period)
  assert.equal(parsed, "2026/2027 semester 2")
  assert.equal(formatAcademicPeriod(parsed), "2026/2027 Semester 2")

  const searchType: SearchType = "resources"
  const parsedSearchType = searchTypeSchema.parse(searchType)
  assert.equal(parsedSearchType, "resources")
})
