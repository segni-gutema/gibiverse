import { Hono } from "hono"
import { statusFor } from "../lib/result.js"
import type { createOverview } from "../modules/overview/index.js"

type OverviewDeps = { overview: ReturnType<typeof createOverview> }

export function createOverviewRoutes({ overview }: OverviewDeps) {
  return new Hono().get("/", async (c) => {
    const result = await overview.getStats()
    if (!result.ok) {
      return c.json({ error: result.error.message }, statusFor(result.error))
    }
    return c.json(result.data)
  })
}
