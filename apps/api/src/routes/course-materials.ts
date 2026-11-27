import { Hono, type Context } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  listCourseMaterialsQuerySchema,
  uploadCourseMaterialSchema,
} from "@gibiverse/shared/validation"
import db from "../db/index.js"
import { statusFor } from "../lib/result.js"
import { requireAuth } from "../middleware/auth.js"
import { createCourseMaterials } from "../modules/course-materials/index.js"
import { createStorage } from "../storage/index.js"

const courseMaterialModule = createCourseMaterials({
  db,
  storage: createStorage(),
})

function contentDisposition(
  disposition: "inline" | "attachment",
  fileName: string
): string {
  const escaped = fileName.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `${disposition}; filename="${escaped}"`
}

async function streamCourseMaterialFile(
  c: Context,
  disposition: "inline" | "attachment"
) {
  const id = c.req.param("id")
  const result = await courseMaterialModule.stream(id)

  if (!result.ok) {
    return c.json({ error: result.error.message }, statusFor(result.error))
  }

  c.header("Content-Type", result.data.contentType)
  c.header(
    "Content-Disposition",
    contentDisposition(disposition, result.data.fileName)
  )
  c.header("Content-Length", String(result.data.size))
  return c.body(result.data.stream)
}

const courseMaterials = new Hono()
  .get(
    "/",
    zValidator("query", listCourseMaterialsQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(
          { error: result.error.issues[0]?.message ?? "Invalid query" },
          400
        )
      }
    }),
    async (c) => {
      const { courseMaterialType, universityId, departmentId, courseId } =
        c.req.valid("query")

      const result = await courseMaterialModule.list({
        courseMaterialType,
        universityId,
        departmentId,
        courseId,
      })

      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }

      return c.json(result.data)
    }
  )
  .get("/:id/download", async (c) => streamCourseMaterialFile(c, "attachment"))
  .get("/:id/preview", async (c) => streamCourseMaterialFile(c, "inline"))
  .get("/:id", async (c) => {
    const id = c.req.param("id")
    const result = await courseMaterialModule.get(id)

    if (!result.ok) {
      return c.json({ error: result.error.message }, statusFor(result.error))
    }

    return c.json(result.data)
  })
  .post(
    "/",
    requireAuth,
    zValidator("form", uploadCourseMaterialSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          { error: result.error.issues[0]?.message ?? "Invalid upload" },
          400
        )
      }
    }),
    async (c) => {
      const user = c.get("user")
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      const { title, courseId, courseMaterialType, academicPeriod, file } =
        c.req.valid("form")

      const data = Buffer.from(await file.arrayBuffer())

      const result = await courseMaterialModule.upload({
        student: { id: user.id, name: user.name },
        title,
        courseId,
        courseMaterialType,
        academicPeriod,
        file: { name: file.name, size: file.size, type: file.type, data },
      })

      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }

      return c.json(result.data, 201)
    }
  )

export { courseMaterials }
