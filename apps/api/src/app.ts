import { Hono } from "hono"
import { auth } from "./lib/auth.js"
import { requireAuth, optionalAuth } from "./middleware/auth.js"
import { academic } from "./routes/academic.js"
import { questions } from "./routes/questions.js"
import { courseMaterials } from "./routes/course-materials.js"
import { search } from "./routes/search.js"
import { votes } from "./routes/votes.js"
import { overview } from "./routes/overview.js"

export const app = new Hono()

// Mount Better Auth router
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

// Mount chained API routes for full RPC type inference
export const routes = app
  .route("/api", academic)
  .route("/api/course-materials", courseMaterials)
  .route("/api/questions", questions)
  .route("/api/votes", votes)
  .route("/api/search", search)
  .route("/api/overview", overview)

export type AppType = typeof routes

// Public root
app.get("/", (c) => {
  return c.text("Hello Hono!")
})

// Non-production test fixture endpoints
if (process.env.NODE_ENV !== "production") {
  // Protected mutation endpoint using requireAuth
  app.post("/api/test-protected", requireAuth, (c) => {
    const user = c.get("user")
    return c.json({
      success: true,
      studentId: user?.id,
    })
  })

  // Public read endpoint using optionalAuth
  app.get("/api/test-public", optionalAuth, (c) => {
    const user = c.get("user")
    return c.json({
      authenticated: !!user,
      student: user
        ? { id: user.id, email: user.email, name: user.name }
        : null,
    })
  })
}

export { requireAuth, optionalAuth }
