import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  MessageSquareQuote,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@gibiverse/ui/components/badge"
import { Button } from "@gibiverse/ui/components/button"
import { client } from "@gibiverse/api-client"
import {
  DEFAULT_PLATFORM_OVERVIEW,
  formatActivityCounter,
  getOverviewEmptyState,
  getRecentQuestionsEmptyState,
  getRecentCourseMaterialsEmptyState,
} from "./home-presentation"
import {
  formatAcademicPeriod,
  formatRelativeUploadDate,
} from "@/lib/formatters"
import {
  courseMaterialTypePillLabels,
  type CourseMaterialType,
} from "@gibiverse/shared/types"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const res = await client.api.overview.$get().catch(() => null)
  const overview = res && res.ok ? await res.json() : DEFAULT_PLATFORM_OVERVIEW
  const heroState = getOverviewEmptyState(overview.stats)
  const recentMaterialsEmpty = getRecentCourseMaterialsEmptyState()
  const recentQuestionsEmpty = getRecentQuestionsEmptyState()
  const totalMaterials = overview.stats.totalCourseMaterials ?? 0
  const recentMaterials = overview.recentCourseMaterials ?? []

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div className="space-y-12 sm:space-y-16">
        {/* Hero Section: Welcoming university community overview */}
        <section
          aria-labelledby="overview-heading"
          className="mx-auto flex max-w-3xl flex-col items-center space-y-6 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>University Academic Hub</span>
          </div>

          <h1
            id="overview-heading"
            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            {heroState.title}
          </h1>

          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            {heroState.description}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 sm:gap-4">
            <Link href="/course-materials">
              <Button size="lg" className="gap-2">
                <BookOpen className="size-4" />
                <span>Browse Course Materials</span>
              </Button>
            </Link>
            <Link href="/questions">
              <Button variant="outline" size="lg" className="gap-2">
                <MessageSquareQuote className="size-4" />
                <span>Ask Questions</span>
              </Button>
            </Link>
          </div>
        </section>

        {/* Platform Activity Counters */}
        <section aria-labelledby="platform-stats-heading" className="space-y-4">
          <h2 id="platform-stats-heading" className="sr-only">
            Platform Activity Statistics
          </h2>
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            data-testid="platform-stats-grid"
          >
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpen className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {formatActivityCounter(totalMaterials)}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Course Materials
                </p>
                <p className="truncate text-xs text-muted-foreground/80">
                  Past exams, lecture notes &amp; slides
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquareQuote className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {formatActivityCounter(overview.stats.totalQuestions)}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  Academic Questions
                </p>
                <p className="truncate text-xs text-muted-foreground/80">
                  Course discussions &amp; peer help
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {formatActivityCounter(overview.stats.activeCourses)}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Courses
                </p>
                <p className="truncate text-xs text-muted-foreground/80">
                  Courses with course materials &amp; Q&amp;A
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Navigation Shortcut Cards — Course Materials and Q&A */}
        <section aria-labelledby="shortcuts-heading" className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2
              id="shortcuts-heading"
              className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              Quick Shortcuts
            </h2>
            <p className="text-sm text-muted-foreground">
              Jump directly into course materials or peer discussions.
            </p>
          </div>

          <div
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            data-testid="shortcut-cards-grid"
          >
            <Link
              href="/course-materials"
              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              data-testid="shortcut-card-course-materials"
            >
              <div className="space-y-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <BookOpen className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Course Materials
                </h3>
                <p className="text-sm text-muted-foreground">
                  Explore past exams, lecture notes, assignments, and slides
                  organised by academic period and department.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
                <span>Browse Course Materials</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              href="/questions"
              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              data-testid="shortcut-card-questions"
            >
              <div className="space-y-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <MessageSquareQuote className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Course Q&amp;A
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ask academic questions, get answers from classmates, vote on
                  questions and answers, and discuss coursework.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
                <span>Join Discussions</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>

        {/* Activity Feeds: Recent Course Materials & Active Questions */}
        <section aria-labelledby="activity-feeds-heading" className="space-y-4">
          <h2 id="activity-feeds-heading" className="sr-only">
            Platform Activity Feeds
          </h2>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Recent Course Materials Feed */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">
                    Recent Course Materials
                  </h3>
                </div>
                <Link
                  href="/course-materials"
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm"
                >
                  <span>View all</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {recentMaterials.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center"
                  data-testid="recent-course-materials-empty"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <BookOpen className="size-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {recentMaterialsEmpty.title}
                  </h4>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {recentMaterialsEmpty.description}
                  </p>
                  <Link href="/course-materials" className="pt-1">
                    <Button variant="outline" size="sm">
                      Upload Course Material
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul
                  className="divide-y divide-border rounded-xl border border-border bg-card shadow-xs"
                  data-testid="recent-course-materials-list"
                >
                  {recentMaterials.map((res) => (
                    <li key={res.id}>
                      <Link
                        href={`/course-materials/${res.id}`}
                        className="group flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
                        data-testid={`recent-course-material-${res.id}`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="font-mono text-xs"
                            >
                              {res.courseCode}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {courseMaterialTypePillLabels[
                                (res.courseMaterialType ??
                                  res.resourceType) as CourseMaterialType
                              ] ??
                                res.courseMaterialType ??
                                res.resourceType}
                            </Badge>
                          </div>
                          <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                            {res.title}
                          </p>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                          <p>
                            {formatAcademicPeriod(res.academicPeriod ?? "")}
                          </p>
                          <time
                            dateTime={res.createdAt}
                            className="text-muted-foreground/80"
                          >
                            {formatRelativeUploadDate(res.createdAt)}
                          </time>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Active Questions Feed — ordered by discussion activity */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">
                    Active Questions
                  </h3>
                </div>
                <Link
                  href="/questions"
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm"
                >
                  <span>View all</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {overview.recentQuestions.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center"
                  data-testid="recent-questions-empty"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <MessageSquareQuote className="size-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {recentQuestionsEmpty.title}
                  </h4>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {recentQuestionsEmpty.description}
                  </p>
                  <Link href="/questions" className="pt-1">
                    <Button variant="outline" size="sm">
                      Ask Question
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul
                  className="divide-y divide-border rounded-xl border border-border bg-card shadow-xs"
                  data-testid="recent-questions-list"
                >
                  {overview.recentQuestions.map((q) => (
                    <li key={q.id}>
                      <Link
                        href={`/questions/${q.id}`}
                        className="group flex flex-col gap-2 p-4 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
                        data-testid={`recent-question-${q.id}`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="font-mono text-xs"
                            >
                              {q.courseCode}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              {q.answerCount === 1
                                ? "1 answer"
                                : `${q.answerCount} answers`}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              {q.voteScore >= 0
                                ? `+${q.voteScore} votes`
                                : `${q.voteScore} votes`}
                            </Badge>
                          </div>
                          <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                            {q.title}
                          </p>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                          <p className="truncate font-medium">
                            {q.studentName}
                          </p>
                          <time
                            dateTime={q.createdAt}
                            className="text-muted-foreground/80"
                          >
                            {formatRelativeUploadDate(q.createdAt)}
                          </time>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
