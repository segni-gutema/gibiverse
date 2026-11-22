import { Hono } from "hono"
import { and, desc, eq, sql, type SQL } from "drizzle-orm"
import db from "../db/index.js"
import { university, department, course } from "../db/schema/academic.js"
import { courseMaterial } from "../db/schema/course-material.js"
import { question } from "../db/schema/question.js"

const academic = new Hono()
  .get("/universities", async (c) => {
    const rows = await db
      .select({
        id: university.id,
        name: university.name,
      })
      .from(university)
      .orderBy(university.name)

    return c.json(rows)
  })
  .get("/departments", async (c) => {
    const universityId = c.req.query("universityId")

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

    return c.json(rows)
  })
  .get("/courses", async (c) => {
    const universityId = c.req.query("universityId")
    const departmentId = c.req.query("departmentId")

    const conditions: SQL[] = []
    if (universityId) {
      conditions.push(eq(course.universityId, universityId))
    }
    if (departmentId) {
      conditions.push(eq(course.departmentId, departmentId))
    }

    const rows = await db
      .select({
        id: course.id,
        name: course.name,
        code: course.code,
        universityId: course.universityId,
        universityName: university.name,
        departmentId: course.departmentId,
        departmentName: department.name,
        materialsCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${courseMaterial} WHERE ${courseMaterial.courseId} = ${course.id}), 0)`,
        questionsCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${question} WHERE ${question.courseId} = ${course.id}), 0)`,
      })
      .from(course)
      .innerJoin(university, eq(course.universityId, university.id))
      .innerJoin(department, eq(course.departmentId, department.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(course.code)

    const mapped = rows.map((r) => ({
      ...r,
      materialsCount: Number(r.materialsCount ?? 0),
      questionsCount: Number(r.questionsCount ?? 0),
    }))

    return c.json(mapped)
  })
  .get("/courses/:id", async (c) => {
    const id = c.req.param("id")

    const rows = await db
      .select({
        id: course.id,
        name: course.name,
        code: course.code,
        universityId: course.universityId,
        universityName: university.name,
        departmentId: course.departmentId,
        departmentName: department.name,
        materialsCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${courseMaterial} WHERE ${courseMaterial.courseId} = ${course.id}), 0)`,
        questionsCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${question} WHERE ${question.courseId} = ${course.id}), 0)`,
      })
      .from(course)
      .innerJoin(university, eq(course.universityId, university.id))
      .innerJoin(department, eq(course.departmentId, department.id))
      .where(eq(course.id, id))
      .limit(1)

    const courseData = rows[0]
    if (!courseData) {
      return c.json({ error: "Course not found" }, 404)
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

    return c.json({
      ...courseData,
      materialsCount: Number(courseData.materialsCount ?? 0),
      questionsCount: Number(courseData.questionsCount ?? 0),
      materials,
      questions,
    })
  })

export { academic }
