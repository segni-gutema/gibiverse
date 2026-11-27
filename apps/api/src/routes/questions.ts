import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  questionSortSchema,
  askQuestionSchema,
  postAnswerSchema,
  acceptAnswerSchema,
} from "@gibiverse/shared/types"
import { statusFor } from "../lib/result.js"
import { requireAuth, optionalAuth } from "../middleware/auth.js"
import type { createQa } from "../modules/qa/index.js"

type QaDeps = { qa: ReturnType<typeof createQa> }

function studentFromUser(
  user: { id: string; name: string } | null | undefined
) {
  if (!user) return null
  return { id: user.id, name: user.name }
}

export function createQuestionRoutes({ qa }: QaDeps) {
  return new Hono()
    .get("/", optionalAuth, async (c) => {
      const user = c.get("user")
      const courseId = c.req.query("courseId")?.trim() || undefined
      const departmentId = c.req.query("departmentId")?.trim() || undefined
      const sortRaw = c.req.query("sort")?.trim() || "newest"

      const sortParsed = questionSortSchema.safeParse(sortRaw)
      if (!sortParsed.success) {
        return c.json({ error: "Invalid sort" }, 400)
      }

      const result = await qa.list({
        student: studentFromUser(user),
        filters: { courseId, departmentId, sort: sortParsed.data },
      })

      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }

      return c.json(result.data)
    })
    .get("/:id", optionalAuth, async (c) => {
      const user = c.get("user")
      const questionId = c.req.param("id")

      const result = await qa.get({
        student: studentFromUser(user),
        questionId,
      })

      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }

      return c.json(result.data)
    })
    .post(
      "/",
      requireAuth,
      zValidator("json", askQuestionSchema, (result, c) => {
        if (!result.success) {
          return c.json(
            {
              error:
                result.error.issues[0]?.message ?? "Invalid question input",
            },
            400
          )
        }
      }),
      async (c) => {
        const user = c.get("user")
        if (!user) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        const payload = c.req.valid("json")

        const result = await qa.ask({
          student: { id: user.id, name: user.name },
          ...payload,
        })

        if (!result.ok) {
          return c.json(
            { error: result.error.message },
            statusFor(result.error)
          )
        }

        return c.json(result.data, 201)
      }
    )
    .post(
      "/:id/answers",
      requireAuth,
      zValidator("json", postAnswerSchema, (result, c) => {
        if (!result.success) {
          return c.json(
            {
              error: result.error.issues[0]?.message ?? "Invalid answer input",
            },
            400
          )
        }
      }),
      async (c) => {
        const user = c.get("user")
        if (!user) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        const questionId = c.req.param("id")
        const { body } = c.req.valid("json")

        const result = await qa.answer({
          student: { id: user.id, name: user.name },
          questionId,
          body,
        })

        if (!result.ok) {
          return c.json(
            { error: result.error.message },
            statusFor(result.error)
          )
        }

        return c.json(result.data, 201)
      }
    )
    .post(
      "/:id/accept",
      requireAuth,
      zValidator("json", acceptAnswerSchema, (result, c) => {
        if (!result.success) {
          return c.json(
            {
              error:
                result.error.issues[0]?.message ??
                "Invalid accepted answer payload",
            },
            400
          )
        }
      }),
      async (c) => {
        const user = c.get("user")
        if (!user) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        const questionId = c.req.param("id")
        const { answerId } = c.req.valid("json")

        const result = await qa.accept({
          student: { id: user.id, name: user.name },
          questionId,
          answerId,
        })

        if (!result.ok) {
          return c.json(
            { error: result.error.message },
            statusFor(result.error)
          )
        }

        return c.json(result.data, 200)
      }
    )
}
