import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { searchQuerySchema, type SearchType } from "@gibiverse/shared/types"
import db from "../db/index.js"
import { course, department, university } from "../db/schema/academic.js"
import { user as student } from "../db/schema/auth.js"
import { question } from "../db/schema/question.js"
import { courseMaterial } from "../db/schema/course-material.js"
import { vote } from "../db/schema/vote.js"
import { optionalAuth } from "../middleware/auth.js"

export type { SearchType }

const ALL_PREVIEW_LIMIT = 6

type ReturnedMaterial = {
  id: string
  title: string
  courseMaterialType: string
  resourceType: string
  academicPeriod: string
  createdAt: Date | string
  courseId: string
  courseCode: string
  courseName: string
  universityId: string
  universityName: string
  departmentId: string
}

type ReturnedQuestion = {
  id: string
  title: string
  body: string
  createdAt: Date | string
  courseId: string
  courseCode: string
  courseName: string
  universityId: string
  universityName: string
  studentId: string
  studentName: string
  voteScore: number
  answerCount: number
  userVote: number | null
}

type ReturnedCourse = {
  id: string
  name: string
  code: string
  universityId: string
  universityName: string
  departmentId: string
  departmentName: string
  materialsCount: number
  questionsCount: number
}

const search = new Hono().get(
  "/",
  optionalAuth,
  zValidator("query", searchQuerySchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Invalid search type" }, 400)
    }
  }),
  async (c) => {
    const user = c.get("user")
    const {
      q,
      type,
      universityId,
      departmentId,
      courseId,
      courseMaterialType,
      sort,
    } = c.req.valid("query")

    if (!q) {
      return c.json({
        query: "",
        type,
        counts: {
          all: 0,
          resources: 0,
          questions: 0,
          courses: 0,
        },
        resources: [],
        questions: [],
        courses: [],
      })
    }

    const searchPattern = `%${q}%`

    // --- Base Matching Conditions (used for unfiltered tab badge counts) ---
    const materialBaseCondition = or(
      ilike(courseMaterial.title, searchPattern),
      ilike(course.code, searchPattern)
    )!

    const questionBaseCondition = or(
      ilike(question.title, searchPattern),
      ilike(question.body, searchPattern),
      ilike(course.code, searchPattern)
    )!

    const courseBaseCondition = or(
      ilike(course.name, searchPattern),
      ilike(course.code, searchPattern)
    )!

    // --- Tab-Specific Filter Conditions (never applied on "all" overview tab) ---
    const materialFilterConditions: SQL[] = [materialBaseCondition]
    if (type === "resources") {
      if (courseMaterialType) {
        materialFilterConditions.push(
          eq(courseMaterial.courseMaterialType, courseMaterialType)
        )
      }
      if (universityId) {
        materialFilterConditions.push(eq(course.universityId, universityId))
      }
      if (courseId) {
        materialFilterConditions.push(eq(courseMaterial.courseId, courseId))
      }
    }

    const questionFilterConditions: SQL[] = [questionBaseCondition]
    if (type === "questions") {
      if (universityId) {
        questionFilterConditions.push(eq(course.universityId, universityId))
      }
      if (courseId) {
        questionFilterConditions.push(eq(question.courseId, courseId))
      }
    }

    const courseFilterConditions: SQL[] = [courseBaseCondition]
    if (type === "courses") {
      if (universityId) {
        courseFilterConditions.push(eq(course.universityId, universityId))
      }
      if (departmentId) {
        courseFilterConditions.push(eq(course.departmentId, departmentId))
      }
    }

    // 1. Unfiltered Counts for Tab Badges
    const [totalMaterialsRows, totalQuestionsRows, totalCoursesRows] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(courseMaterial)
          .innerJoin(course, eq(courseMaterial.courseId, course.id))
          .where(materialBaseCondition),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(question)
          .innerJoin(course, eq(question.courseId, course.id))
          .innerJoin(student, eq(question.userId, student.id))
          .where(questionBaseCondition),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(course)
          .where(courseBaseCondition),
      ])

    const totalMaterials = totalMaterialsRows[0]?.count ?? 0
    const totalQuestions = totalQuestionsRows[0]?.count ?? 0
    const totalCourses = totalCoursesRows[0]?.count ?? 0

    const counts = {
      all: totalMaterials + totalQuestions + totalCourses,
      resources: totalMaterials,
      questions: totalQuestions,
      courses: totalCourses,
    }

    // 2. Fetch results based on requested type
    let returnedMaterials: ReturnedMaterial[] = []
    let returnedQuestions: ReturnedQuestion[] = []
    let returnedCourses: ReturnedCourse[] = []

    if (type === "all" || type === "resources") {
      const rows = await db
        .select({
          id: courseMaterial.id,
          title: courseMaterial.title,
          courseMaterialType: courseMaterial.courseMaterialType,
          resourceType: courseMaterial.courseMaterialType,
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
        .where(and(...materialFilterConditions))
        .orderBy(desc(courseMaterial.createdAt))

      returnedMaterials =
        type === "all" ? rows.slice(0, ALL_PREVIEW_LIMIT) : rows
    }

    if (type === "all" || type === "questions") {
      const questionOrderBy =
        type === "questions" && sort === "most_voted"
          ? [desc(question.voteScore), desc(question.createdAt)]
          : type === "questions" && sort === "unanswered"
            ? [asc(question.answerCount), desc(question.createdAt)]
            : [desc(question.createdAt)]

      const baseSelect = {
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
        studentName: student.name,
        voteScore: question.voteScore,
        answerCount: question.answerCount,
        userVote: user
          ? vote.value
          : sql<number | null>`null`.as("userVote"),
      }

      const rows = user
        ? await db
            .select(baseSelect)
            .from(question)
            .innerJoin(course, eq(question.courseId, course.id))
            .innerJoin(university, eq(course.universityId, university.id))
            .innerJoin(student, eq(question.userId, student.id))
            .leftJoin(
              vote,
              and(
                eq(vote.targetId, question.id),
                eq(vote.targetType, "question"),
                eq(vote.userId, user.id)
              )
            )
            .where(and(...questionFilterConditions))
            .orderBy(...questionOrderBy)
        : await db
            .select(baseSelect)
            .from(question)
            .innerJoin(course, eq(question.courseId, course.id))
            .innerJoin(university, eq(course.universityId, university.id))
            .innerJoin(student, eq(question.userId, student.id))
            .where(and(...questionFilterConditions))
            .orderBy(...questionOrderBy)

      returnedQuestions =
        type === "all" ? rows.slice(0, ALL_PREVIEW_LIMIT) : rows
    }

    if (type === "all" || type === "courses") {
      const materialsCountSql = sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${courseMaterial} WHERE ${courseMaterial.courseId} = ${course.id}), 0)`
      const questionsCountSql = sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${question} WHERE ${question.courseId} = ${course.id}), 0)`

      const courseOrderBy =
        type === "courses" && sort === "materials-desc"
          ? [desc(materialsCountSql), asc(course.code)]
          : type === "courses" && sort === "qa-desc"
            ? [desc(questionsCountSql), asc(course.code)]
            : [asc(course.code)]

      const rawCourses = await db
        .select({
          id: course.id,
          name: course.name,
          code: course.code,
          universityId: course.universityId,
          universityName: university.name,
          departmentId: course.departmentId,
          departmentName: department.name,
          materialsCount: materialsCountSql,
          questionsCount: questionsCountSql,
        })
        .from(course)
        .innerJoin(university, eq(course.universityId, university.id))
        .innerJoin(department, eq(course.departmentId, department.id))
        .where(and(...courseFilterConditions))
        .orderBy(...courseOrderBy)

      const formattedCourses = rawCourses.map((row) => ({
        ...row,
        materialsCount: Number(row.materialsCount ?? 0),
        questionsCount: Number(row.questionsCount ?? 0),
      }))

      returnedCourses =
        type === "all"
          ? formattedCourses.slice(0, ALL_PREVIEW_LIMIT)
          : formattedCourses
    }

    return c.json({
      query: q,
      type,
      counts,
      resources: returnedMaterials,
      questions: returnedQuestions,
      courses: returnedCourses,
    })
  }
)

export { search }
