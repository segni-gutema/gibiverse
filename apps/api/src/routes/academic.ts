import { Hono } from "hono"
import { and, eq, sql, type SQL } from "drizzle-orm"
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

export { academic }
