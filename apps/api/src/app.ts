import { Hono } from "hono"
import { auth } from "./lib/auth.js"
import { requireAuth, optionalAuth } from "./middleware/auth.js"
import db from "./db/index.js"
import { createAcademic } from "./modules/academic/index.js"
import { createCourseMaterials } from "./modules/course-materials/index.js"
import { createQa } from "./modules/qa/index.js"
import { createVoting } from "./modules/voting/index.js"
import { createSearch } from "./modules/search/index.js"
import { createOverview } from "./modules/overview/index.js"
import { createStorage } from "./storage/index.js"
import { createAcademicRoutes } from "./routes/academic.js"
import { createQuestionRoutes } from "./routes/questions.js"
import { createCourseMaterialRoutes } from "./routes/course-materials.js"
import { createVoteRoutes } from "./routes/votes.js"
import { createSearchRoutes } from "./routes/search.js"
import { createOverviewRoutes } from "./routes/overview.js"

// Compose domain modules
const academic = createAcademic({ db })
const courseMaterials = createCourseMaterials({ db, storage: createStorage() })
const qa = createQa({ db })
const voting = createVoting({ db })
const search = createSearch({ db })
const overview = createOverview({ db })

export const app = new Hono()

// Mount Better Auth router
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

// Mount chained API routes for full RPC type inference
export const routes = app
  .route("/api", createAcademicRoutes({ academic }))
  .route(
    "/api/course-materials",
    createCourseMaterialRoutes({ courseMaterials })
  )
  .route("/api/questions", createQuestionRoutes({ qa }))
  .route("/api/votes", createVoteRoutes({ voting }))
  .route("/api/search", createSearchRoutes({ search }))
  .route("/api/overview", createOverviewRoutes({ overview }))

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
