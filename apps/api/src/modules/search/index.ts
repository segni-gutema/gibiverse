import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import type { SearchType, SearchSort } from "@gibiverse/shared/types"
import { course, university } from "../../db/schema/academic.js"
import { user as studentTable } from "../../db/schema/auth.js"
import { question } from "../../db/schema/question.js"
import { courseMaterial } from "../../db/schema/course-material.js"
import { vote } from "../../db/schema/vote.js"
import { studentVoteProjection } from "../../lib/queries.js"
import {
  courseWithCounts,
  formatCourseSummary,
  materialsCountSql,
  questionsCountSql,
} from "../academic/index.js"
import {
  ok,
  type Db,
  type StudentIdentity,
  type Result,
  type DomainError,
} from "../../lib/result.js"

export type { DomainError as SearchError }
export type SearchResult<T> = Result<T>

const ALL_PREVIEW_LIMIT = 6

export type SearchMaterialsInput = {
  query: string
  universityId?: string
  courseId?: string
  courseMaterialType?: string
  type?: SearchType
}

export type SearchQuestionsInput = {
  query: string
  student: StudentIdentity | null
  universityId?: string
  courseId?: string
  sort?: SearchSort
  type?: SearchType
}

export type SearchCoursesInput = {
  query: string
  universityId?: string
  departmentId?: string
  sort?: SearchSort
  type?: SearchType
}

export type SearchAllInput = {
  query: string
  type: SearchType
  student: StudentIdentity | null
  universityId?: string
  departmentId?: string
  courseId?: string
  courseMaterialType?: string
  sort?: SearchSort
}

export function createSearch(deps: { db: Db }) {
  const { db } = deps

  async function searchMaterials(input: SearchMaterialsInput) {
    const { query, universityId, courseId, courseMaterialType, type } = input
    const searchPattern = `%${query}%`

    const baseCondition = or(
      ilike(courseMaterial.title, searchPattern),
      ilike(course.code, searchPattern)
    )!

    const conditions: SQL[] = [baseCondition]
    if (type === "course-materials") {
      if (courseMaterialType) {
        conditions.push(
          eq(courseMaterial.courseMaterialType, courseMaterialType)
        )
      }
      if (universityId) {
        conditions.push(eq(course.universityId, universityId))
      }
      if (courseId) {
        conditions.push(eq(courseMaterial.courseId, courseId))
      }
    }

    const rows = await db
      .select({
        id: courseMaterial.id,
        title: courseMaterial.title,
        courseMaterialType: courseMaterial.courseMaterialType,
        academicPeriod: courseMaterial.academicPeriod,
        createdAt: courseMaterial.createdAt,
        courseId: courseMaterial.courseId,
        courseCode: course.code,
        courseName: course.name,
        universityId: course.universityId,
        universityName: university.name,
        departmentId: course.departmentId,
      })
      .from(courseMaterial)
      .innerJoin(course, eq(courseMaterial.courseId, course.id))
      .innerJoin(university, eq(course.universityId, university.id))
      .where(and(...conditions))
      .orderBy(desc(courseMaterial.createdAt))

    return ok(rows)
  }

  async function searchQuestions(input: SearchQuestionsInput) {
    const { query, student, universityId, courseId, sort, type } = input
    const searchPattern = `%${query}%`

    const baseCondition = or(
      ilike(question.title, searchPattern),
      ilike(question.body, searchPattern),
      ilike(course.code, searchPattern)
    )!

    const conditions: SQL[] = [baseCondition]
    if (type === "questions") {
      if (universityId) {
        conditions.push(eq(course.universityId, universityId))
      }
      if (courseId) {
        conditions.push(eq(question.courseId, courseId))
      }
    }

    const orderBy =
      type === "questions" && sort === "most_voted"
        ? [desc(question.voteScore), desc(question.createdAt)]
        : type === "questions" && sort === "unanswered"
          ? [asc(question.answerCount), desc(question.createdAt)]
          : [desc(question.createdAt)]

    const { studentVote, joinOn } = studentVoteProjection(
      student?.id,
      "question",
      question.id
    )

    const base = db
      .select({
        id: question.id,
        title: question.title,
        body: question.body,
        createdAt: question.createdAt,
        courseId: question.courseId,
        courseCode: course.code,
        courseName: course.name,
        universityId: course.universityId,
        universityName: university.name,
        studentId: question.userId,
        studentName: studentTable.name,
        voteScore: question.voteScore,
        answerCount: question.answerCount,
        studentVote,
      })
      .from(question)
      .innerJoin(course, eq(question.courseId, course.id))
      .innerJoin(university, eq(course.universityId, university.id))
      .innerJoin(studentTable, eq(question.userId, studentTable.id))

    const withVote = joinOn ? base.leftJoin(vote, joinOn) : base
    const rows = await withVote.where(and(...conditions)).orderBy(...orderBy)

    return ok(rows)
  }

  async function searchCourses(input: SearchCoursesInput) {
    const { query, universityId, departmentId, sort, type } = input
    const searchPattern = `%${query}%`

    const baseCondition = or(
      ilike(course.name, searchPattern),
      ilike(course.code, searchPattern)
    )!

    const conditions: SQL[] = [baseCondition]
    if (type === "courses") {
      if (universityId) {
        conditions.push(eq(course.universityId, universityId))
      }
      if (departmentId) {
        conditions.push(eq(course.departmentId, departmentId))
      }
    }

    const orderBy =
      type === "courses" && sort === "materials-desc"
        ? [desc(materialsCountSql), asc(course.code)]
        : type === "courses" && sort === "qa-desc"
          ? [desc(questionsCountSql), asc(course.code)]
          : [asc(course.code)]

    const rawCourses = await courseWithCounts(db)
      .where(and(...conditions))
      .orderBy(...orderBy)

    const formatted = rawCourses.map(formatCourseSummary)
    return ok(formatted)
  }

  async function searchAll(input: SearchAllInput) {
    const {
      query,
      type,
      student,
      universityId,
      departmentId,
      courseId,
      courseMaterialType,
      sort,
    } = input

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return ok({
        query: "",
        type,
        counts: { all: 0, courseMaterials: 0, questions: 0, courses: 0 },
        courseMaterials: [],
        questions: [],
        courses: [],
      })
    }

    const searchPattern = `%${trimmedQuery}%`

    // Unfiltered base conditions (for tab badge counts)
    const materialBase = or(
      ilike(courseMaterial.title, searchPattern),
      ilike(course.code, searchPattern)
    )!
    const questionBase = or(
      ilike(question.title, searchPattern),
      ilike(question.body, searchPattern),
      ilike(course.code, searchPattern)
    )!
    const courseBase = or(
      ilike(course.name, searchPattern),
      ilike(course.code, searchPattern)
    )!

    const [totalMaterialsRows, totalQuestionsRows, totalCoursesRows] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(courseMaterial)
          .innerJoin(course, eq(courseMaterial.courseId, course.id))
          .where(materialBase),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(question)
          .innerJoin(course, eq(question.courseId, course.id))
          .innerJoin(studentTable, eq(question.userId, studentTable.id))
          .where(questionBase),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(course)
          .where(courseBase),
      ])

    const totalMaterials = totalMaterialsRows[0]?.count ?? 0
    const totalQuestions = totalQuestionsRows[0]?.count ?? 0
    const totalCourses = totalCoursesRows[0]?.count ?? 0

    const counts = {
      all: totalMaterials + totalQuestions + totalCourses,
      courseMaterials: totalMaterials,
      questions: totalQuestions,
      courses: totalCourses,
    }

    type OkData<T> =
      Extract<T, { ok: true }> extends { data: infer D } ? D : never

    let returnedMaterials: OkData<Awaited<ReturnType<typeof searchMaterials>>> =
      []
    let returnedQuestions: OkData<Awaited<ReturnType<typeof searchQuestions>>> =
      []
    let returnedCourses: OkData<Awaited<ReturnType<typeof searchCourses>>> = []

    if (type === "all" || type === "course-materials") {
      const res = await searchMaterials({
        query: trimmedQuery,
        universityId,
        courseId,
        courseMaterialType,
        type,
      })
      if (!res.ok) return res
      returnedMaterials =
        type === "all" ? res.data.slice(0, ALL_PREVIEW_LIMIT) : res.data
    }

    if (type === "all" || type === "questions") {
      const res = await searchQuestions({
        query: trimmedQuery,
        student,
        universityId,
        courseId,
        sort,
        type,
      })
      if (!res.ok) return res
      returnedQuestions =
        type === "all" ? res.data.slice(0, ALL_PREVIEW_LIMIT) : res.data
    }

    if (type === "all" || type === "courses") {
      const res = await searchCourses({
        query: trimmedQuery,
        universityId,
        departmentId,
        sort,
        type,
      })
      if (!res.ok) return res
      returnedCourses =
        type === "all" ? res.data.slice(0, ALL_PREVIEW_LIMIT) : res.data
    }

    return ok({
      query: trimmedQuery,
      type,
      counts,
      courseMaterials: returnedMaterials,
      questions: returnedQuestions,
      courses: returnedCourses,
    })
  }

  return {
    searchMaterials,
    searchQuestions,
    searchCourses,
    searchAll,
  }
}

export type Search = ReturnType<typeof createSearch>
