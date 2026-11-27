import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { castVoteSchema } from "@gibiverse/shared/validation"
import db from "../db/index.js"
import { statusFor } from "../lib/result.js"
import { requireAuth } from "../middleware/auth.js"
import { createVoting } from "../modules/voting/index.js"

const voting = createVoting({ db })
const votes = new Hono().post(
  "/",
  requireAuth,
  zValidator("json", castVoteSchema),
  async (c) => {
    const user = c.get("user")
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const { targetType, targetId, value } = c.req.valid("json")

    const result = await voting.cast({
      student: { id: user.id, name: user.name },
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

export { votes }
