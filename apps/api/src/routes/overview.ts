import { Hono } from "hono"
import db from "../db/index.js"
import { statusFor } from "../lib/result.js"
import { createOverview } from "../modules/overview/index.js"

const overviewModule = createOverview({ db })

const overview = new Hono().get("/", async (c) => {
  const result = await overviewModule.getStats()
  if (!result.ok) {
    return c.json({ error: result.error.message }, statusFor(result.error))
  }
  return c.json(result.data)
})

export { overview }
