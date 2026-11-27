import { Hono } from "hono"
import { courseQuerySchema } from "@gibiverse/shared/types"
import { statusFor } from "../lib/result.js"
import type { createAcademic } from "../modules/academic/index.js"

type AcademicDeps = { academic: ReturnType<typeof createAcademic> }

export function createAcademicRoutes({ academic }: AcademicDeps) {
  return new Hono()
    .get("/universities", async (c) => {
      const result = await academic.listUniversities()
      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }
      return c.json(result.data)
    })
    .get("/departments", async (c) => {
      const universityId = c.req.query("universityId")
      const result = await academic.listDepartments(universityId)
      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }
      return c.json(result.data)
    })
    .get("/courses", async (c) => {
      const universityId = c.req.query("universityId")
      const departmentId = c.req.query("departmentId")

      const parsed = courseQuerySchema.safeParse({ universityId, departmentId })
      if (!parsed.success) {
        return c.json({ error: "Invalid query parameters" }, 400)
      }

      const result = await academic.listCourses(parsed.data)
      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }
      return c.json(result.data)
    })
    .get("/courses/:id", async (c) => {
      const id = c.req.param("id")
      const result = await academic.getCourseDetails(id)
      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }
      return c.json(result.data)
    })
}
