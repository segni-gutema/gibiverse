import { Hono } from "hono"
import { count, desc, eq, sql } from "drizzle-orm"
import db from "../db/index.js"
import { course } from "../db/schema/academic.js"
import { user as student } from "../db/schema/auth.js"
import { question } from "../db/schema/question.js"
import { courseMaterial } from "../db/schema/course-material.js"

const overview = new Hono().get("/", async (c) => {
  const [
    materialsCountResult,
    questionsCountResult,
    activeCoursesResult,
    recentCourseMaterials,
    recentQuestions,
  ] = await Promise.all([
    db.select({ count: count() }).from(courseMaterial),
    db.select({ count: count() }).from(question),
    db.execute<{ count: string | number }>(
      sql`SELECT COUNT(DISTINCT active.course_id)::int AS count FROM (
        SELECT ${courseMaterial.courseId} AS course_id FROM ${courseMaterial}
        UNION
        SELECT ${question.courseId} AS course_id FROM ${question}
      ) AS active`
    ),
    db
      .select({
        id: courseMaterial.id,
        title: courseMaterial.title,
        courseMaterialType: courseMaterial.courseMaterialType,
        academicPeriod: courseMaterial.academicPeriod,
        createdAt: courseMaterial.createdAt,
        courseId: courseMaterial.courseId,
        courseCode: course.code,
        courseName: course.name,
      })
      .from(courseMaterial)
      .innerJoin(course, eq(courseMaterial.courseId, course.id))
      .orderBy(desc(courseMaterial.createdAt))
      .limit(6),
    db
      .select({
        id: question.id,
        title: question.title,
        body: question.body,
        createdAt: question.createdAt,
        courseId: question.courseId,
        courseCode: course.code,
        courseName: course.name,
        studentId: question.userId,
        studentName: student.name,
        voteScore: question.voteScore,
        answerCount: question.answerCount,
      })
      .from(question)
      .innerJoin(course, eq(question.courseId, course.id))
      .innerJoin(student, eq(question.userId, student.id))
      // Rank by discussion activity: answers weighted 2x + vote score, then recency
      .orderBy(
        desc(sql`${question.answerCount} * 2 + ${question.voteScore}`),
        desc(question.createdAt)
      )
      .limit(6),
  ])

  const totalCourseMaterials = Number(materialsCountResult[0]?.count ?? 0)
  const totalQuestions = Number(questionsCountResult[0]?.count ?? 0)
  const activeCoursesRaw =
    (activeCoursesResult as { rows?: Array<{ count?: string | number }> })
      .rows?.[0]?.count ??
    (activeCoursesResult as unknown as Array<{ count?: string | number }>)[0]
      ?.count
  const activeCourses = Number(activeCoursesRaw ?? 0)

  return c.json({
    stats: {
      totalCourseMaterials,
      totalQuestions,
      activeCourses,
    },
    recentCourseMaterials,
    recentQuestions,
  })
})

export { overview }
