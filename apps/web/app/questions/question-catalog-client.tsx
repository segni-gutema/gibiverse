"use client"

import * as React from "react"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { cn } from "@gibiverse/ui/lib/utils"
import { Badge } from "@gibiverse/ui/components/badge"
import { Button } from "@gibiverse/ui/components/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@gibiverse/ui/components/toggle-group"
import { CourseFilterDropdown } from "@/components/course-filter-dropdown"
import { VoteControls } from "@/components/vote-controls"
import { client } from "@gibiverse/api-client"
import type { Course, University } from "@/app/courses/presentation"
import { formatRelativeUploadDate } from "@/lib/formatters"
import { ACTIVE_TOGGLE_CLASSES } from "@/lib/toggle-styles"
import {
  hasActiveQuestionFilters,
  questionCatalogEmptyState,
  type CatalogQuestion,
  type QuestionCatalogFilters,
  type QuestionSort,
} from "./presentation"

const SORT_OPTIONS: { value: QuestionSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "most_voted", label: "Most Voted" },
  { value: "unanswered", label: "Unanswered" },
]

export function QuestionCatalogClient({
  universities,
  courses,
  initialQuestions,
}: {
  universities: University[]
  courses: Course[]
  initialQuestions: CatalogQuestion[]
}) {
  const [filters, setFilters] = React.useState<QuestionCatalogFilters>({
    courseId: null,
    universityId: null,
    sort: "newest",
  })
  const [questions, setQuestions] =
    React.useState<CatalogQuestion[]>(initialQuestions)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const isFirstRender = React.useRef(true)

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    client.api.questions
      .$get({
        query: {
          courseId: filters.courseId || undefined,
          universityId: filters.universityId || undefined,
          departmentId: filters.departmentId || undefined,
          sort: filters.sort,
        },
      })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load questions")
        return res.json()
      })
      .then((next) => {
        if (!cancelled) setQuestions(next)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load questions. Please try again.")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  const emptyState = questionCatalogEmptyState(filters)

  return (
    <div className="flex flex-col gap-6">
      <section
        className="flex flex-col gap-3"
        aria-labelledby="filters-heading"
      >
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={2}
            value={[filters.sort]}
            onValueChange={(next) => {
              const selected = next[0] as QuestionSort | undefined
              const match = SORT_OPTIONS.find(
                (option) => option.value === selected
              )
              if (!match) return
              setFilters((prev) => ({ ...prev, sort: match.value }))
            }}
            className="flex max-w-full flex-wrap"
            aria-label="Sort questions"
            data-testid="question-sort-filters"
          >
            {SORT_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                aria-label={option.label}
                className={ACTIVE_TOGGLE_CLASSES}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <CourseFilterDropdown
            universities={universities}
            courses={courses}
            selectedUniversityId={filters.universityId}
            selectedCourseId={filters.courseId}
            onFilterChange={({ universityId, courseId }) =>
              setFilters((prev) => ({
                ...prev,
                universityId,
                courseId,
              }))
            }
          />
        </div>
      </section>

      <section
        className="flex flex-col gap-4"
        aria-labelledby="catalog-heading"
        aria-busy={isLoading}
      >
        <div className="flex items-center justify-between gap-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Updating…</p>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {questions.length === 0 ? (
          <div
            className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-6 py-10"
            data-testid="questions-empty-state"
          >
            <h3 className="text-base font-semibold text-foreground">
              {emptyState.title}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {emptyState.description}
            </p>
            {hasActiveQuestionFilters(filters) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    courseId: null,
                    universityId: null,
                    departmentId: null,
                  }))
                }
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul
            className="flex max-w-4xl flex-col gap-4"
            data-testid="questions-grid"
          >
            {questions.map((question) => (
              <li key={question.id}>
                <QuestionCard
                  question={question}
                  courses={courses}
                  universities={universities}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function QuestionCard({
  question,
  courses,
  universities,
}: {
  question: CatalogQuestion
  courses?: Course[]
  universities?: University[]
}) {
  const course = courses?.find((c) => c.id === question.courseId)
  const universityName = course
    ? universities?.find((u) => u.id === course.universityId)?.name
    : null

  return (
    <article
      className="group flex gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-foreground/20 hover:shadow-md"
      data-testid={`question-card-${question.id}`}
    >
      <div className="flex shrink-0 flex-col items-center justify-start pt-0.5">
        <VoteControls
          targetType="question"
          targetId={question.id}
          initialScore={question.voteScore}
          initialUserVote={question.userVote}
          orientation="vertical"
          size="sm"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {universityName ? (
              <>
                <span className="truncate font-medium text-foreground/80">
                  {universityName}
                </span>
                <span aria-hidden="true" className="text-muted-foreground/50">
                  ·
                </span>
              </>
            ) : null}
            <Badge variant="secondary" className="font-mono text-[11px]">
              {question.courseCode}
            </Badge>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              question.answerCount > 0
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            <MessageCircle className="size-3.5" aria-hidden="true" />
            <span>
              {question.answerCount}{" "}
              {question.answerCount === 1 ? "answer" : "answers"}
            </span>
          </span>
        </div>

        <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
          <Link href={`/questions/${question.id}`} className="hover:underline">
            {question.title}
          </Link>
        </h3>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {question.body}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {question.studentName}
          </span>
          <time dateTime={question.createdAt}>
            {formatRelativeUploadDate(question.createdAt)}
          </time>
        </div>
      </div>
    </article>
  )
}
