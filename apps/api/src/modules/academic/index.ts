import { and, desc, eq, sql, type SQL } from "drizzle-orm"
import type {
  CourseDetailsData,
  CourseSummary,
  ScopedCourseMaterial,
  ScopedQuestion,
} from "@gibiverse/shared/types"
import { university, department, course } from "../../db/schema/academic.js"
import { courseMaterial } from "../../db/schema/course-material.js"
import { question } from "../../db/schema/question.js"
import {
  ok,
  err,
  type Db,
  type Result,
  type DomainError,
} from "../../lib/result.js"

export type { DomainError as AcademicError }
export type AcademicResult<T> = Result<T>

export const materialsCountSql = sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${courseMaterial} WHERE ${courseMaterial.courseId} = ${course.id}), 0)`
export const questionsCountSql = sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${question} WHERE ${question.courseId} = ${course.id}), 0)`

export const courseWithCountsProjection = {
  id: course.id,
  name: course.name,
  code: course.code,
  universityId: course.universityId,
  universityName: university.name,
  departmentId: course.departmentId,
  departmentName: department.name,
  materialsCount: materialsCountSql,
  questionsCount: questionsCountSql,
}

/**
 * Shared query builder for courses joined with university, department, and
 * correlated material/question counts. Reused by the Search module.
 */
export function courseWithCounts(db: Db) {
  return db
    .select(courseWithCountsProjection)
    .from(course)
    .innerJoin(university, eq(course.universityId, university.id))
    .innerJoin(department, eq(course.departmentId, department.id))
}

export function formatCourseSummary(row: {
  id: string
  name: string
  code: string
  universityId: string
  universityName: string
  departmentId: string
  departmentName: string
  materialsCount: number | null | undefined
  questionsCount: number | null | undefined
}): CourseSummary {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    universityId: row.universityId,
    universityName: row.universityName,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    materialsCount: Number(row.materialsCount ?? 0),
    questionsCount: Number(row.questionsCount ?? 0),
  }
}

export type CourseFilters = {
  universityId?: string
  departmentId?: string
}

export function createAcademic(deps: { db: Db }) {
  const { db } = deps

  async function listUniversities() {
    const rows = await db
      .select({
        id: university.id,
        name: university.name,
      })
      .from(university)
      .orderBy(university.name)

    return ok(rows)
  }

  async function listDepartments(universityId?: string) {
    const query = db
      .select({
        id: department.id,
        name: department.name,
        universityId: department.universityId,
      })
      .from(department)
      .orderBy(department.name)

    const rows = universityId
      ? await query.where(eq(department.universityId, universityId))
      : await query

    return ok(rows)
  }

  async function listCourses(filters: CourseFilters = {}) {
    const conditions: SQL[] = []
    if (filters.universityId) {
      conditions.push(eq(course.universityId, filters.universityId))
    }
    if (filters.departmentId) {
      conditions.push(eq(course.departmentId, filters.departmentId))
    }

    const rows = await courseWithCounts(db)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(course.code)

    const mapped: CourseSummary[] = rows.map(formatCourseSummary)
    return ok(mapped)
  }

  async function getCourseDetails(
    id: string
  ): Promise<AcademicResult<CourseDetailsData>> {
    const [courseData] = await courseWithCounts(db)
      .where(eq(course.id, id))
      .limit(1)

    if (!courseData) {
      return err("not_found", "Course not found")
    }

    const [materials, questions] = await Promise.all([
      db
        .select({
          id: courseMaterial.id,
          title: courseMaterial.title,
          courseMaterialType: courseMaterial.courseMaterialType,
          academicPeriod: courseMaterial.academicPeriod,
          fileName: courseMaterial.fileName,
          fileSize: courseMaterial.fileSize,
          mimeType: courseMaterial.mimeType,
          createdAt: courseMaterial.createdAt,
        })
        .from(courseMaterial)
        .where(eq(courseMaterial.courseId, id))
        .orderBy(desc(courseMaterial.createdAt)),
      db
        .select({
          id: question.id,
          title: question.title,
          body: question.body,
          voteScore: question.voteScore,
          answerCount: question.answerCount,
          acceptedAnswerId: question.acceptedAnswerId,
          createdAt: question.createdAt,
        })
        .from(question)
        .where(eq(question.courseId, id))
        .orderBy(desc(question.createdAt)),
    ])

    const detailsData: CourseDetailsData = {
      ...formatCourseSummary(courseData),
      materials: materials as ScopedCourseMaterial[],
      questions: questions as ScopedQuestion[],
    }

    return ok(detailsData)
  }

  return {
    listUniversities,
    listDepartments,
    listCourses,
    getCourseDetails,
  }
}

export type Academic = ReturnType<typeof createAcademic>
