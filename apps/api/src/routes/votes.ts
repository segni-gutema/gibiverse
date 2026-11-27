import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { castVoteSchema } from "@gibiverse/shared/validation"
import { statusFor } from "../lib/result.js"
import { requireAuth } from "../middleware/auth.js"
import type { createVoting } from "../modules/voting/index.js"

type VotingDeps = { voting: ReturnType<typeof createVoting> }

export function createVoteRoutes({ voting }: VotingDeps) {
  return new Hono().post(
    "/",
    requireAuth,
    zValidator("json", castVoteSchema),
    async (c) => {
      const student = c.get("user")
      if (!student) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      const { targetType, targetId, value } = c.req.valid("json")

      const result = await voting.cast({
        student: { id: student.id, name: student.name },
        targetType,
        targetId,
        value,
      })

      if (!result.ok) {
        return c.json({ error: result.error.message }, statusFor(result.error))
      }

      return c.json(result.data, 200)
    }
  )
}
