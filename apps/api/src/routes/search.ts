import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { searchQuerySchema, type SearchType } from "@gibiverse/shared/types"
import { statusFor } from "../lib/result.js"
import { optionalAuth } from "../middleware/auth.js"
import type { createSearch } from "../modules/search/index.js"

export type { SearchType }

type SearchDeps = { search: ReturnType<typeof createSearch> }

export function createSearchRoutes({ search }: SearchDeps) {
  return new Hono().get(
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

      const result = await search.searchAll({
        query: q,
        type,
        student: user ? { id: user.id, name: user.name } : null,
        universityId,
        departmentId,
        courseId,
        courseMaterialType,
        sort,
      })

      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }

      return c.json(result.data)
    }
  )
}
