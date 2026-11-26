"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search,
  BookOpen,
  MessageSquareQuote,
  MessageCircle,
  MessageSquare,
  File,
  FileText,
  Presentation,
  SlidersHorizontal,
  RotateCcw,
  GraduationCap,
  ArrowUpDown,
  ArrowRight,
  X,
} from "lucide-react"
import { cn } from "@gibiverse/ui/lib/utils"
import { Badge } from "@gibiverse/ui/components/badge"
import { Button } from "@gibiverse/ui/components/button"
import { Input } from "@gibiverse/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gibiverse/ui/components/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@gibiverse/ui/components/toggle-group"
import { client } from "@gibiverse/api-client"
import { formatRelativeUploadDate } from "@/lib/formatters"
import { ACTIVE_TOGGLE_CLASSES } from "@/lib/toggle-styles"
import { CourseFilterDropdown } from "@/components/course-filter-dropdown"
import { VoteControls } from "@/components/vote-controls"
import {
  formatMaterialsCount,
  formatQuestionsCount,
  getAvailableDepartments,
  isDepartmentCompatibleWithUniversity,
  type Course,
  type CourseSortOption,
  type Department,
  type University,
} from "@/app/courses/presentation"
import {
  courseMaterialTypeOptions,
  courseMaterialTypePillLabels,
  type CourseMaterialType,
  type QuestionSort,
} from "@gibiverse/shared/types"
import {
  buildSearchPageUrl,
  emptySearchResponse,
  getSearchEmptyState,
  ALL_TAB_PREVIEW_LIMIT,
  type SearchResponse,
  type SearchResultQuestion,
  type SearchResultCourseMaterial,
  type SearchResultCourse,
  type SearchType,
  type SearchFilterParams,
} from "./presentation"

const ALL_OPTION = "all"
const ALL_MATERIAL_TYPE = "__all_types__"

const QUESTION_SORT_OPTIONS: { value: QuestionSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "most_voted", label: "Most Voted" },
  { value: "unanswered", label: "Unanswered" },
]

interface SearchClientProps {
  initialQuery: string
  initialType: SearchType
  initialData: SearchResponse
  initialFilters?: SearchFilterParams
  universities?: University[]
  departments?: Department[]
  courses?: Course[]
}

function CourseMaterialTypeIcon({
  courseMaterialType,
  className,
}: {
  courseMaterialType: string
  className?: string
}) {
  const cls = cn("size-8 text-muted-foreground/60", className)
  switch (courseMaterialType) {
    case "exam":
    case "notes":
    case "assignment":
      return <FileText className={cls} />
    case "slides":
      return <Presentation className={cls} />
    case "lab":
      return <BookOpen className={cls} />
    default:
      return <File className={cls} />
  }
}

export function SearchClient({
  initialQuery,
  initialType,
  initialData,
  initialFilters,
  universities = [],
  departments = [],
  courses = [],
}: SearchClientProps) {
  const router = useRouter()
  const [queryInput, setQueryInput] = React.useState(initialQuery)
  const [activeTab, setActiveTab] = React.useState<SearchType>(initialType)
  const [results, setResults] = React.useState<SearchResponse>(initialData)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // In-tab filter states (initialized only when matching the initial tab)
  const [materialFilters, setMaterialFilters] = React.useState<{
    courseMaterialType: CourseMaterialType | null
    universityId: string | null
    courseId: string | null
  }>({
    courseMaterialType:
      initialType === "course-materials"
        ? (initialFilters?.courseMaterialType as CourseMaterialType) || null
        : null,
    universityId:
      initialType === "course-materials"
        ? initialFilters?.universityId || null
        : null,
    courseId:
      initialType === "course-materials"
        ? initialFilters?.courseId || null
        : null,
  })

  const [questionFilters, setQuestionFilters] = React.useState<{
    sort: QuestionSort
    universityId: string | null
    courseId: string | null
  }>({
    sort:
      initialType === "questions"
        ? (initialFilters?.sort as QuestionSort) || "newest"
        : "newest",
    universityId:
      initialType === "questions" ? initialFilters?.universityId || null : null,
    courseId:
      initialType === "questions" ? initialFilters?.courseId || null : null,
  })

  const [courseFilters, setCourseFilters] = React.useState<{
    universityId: string
    departmentId: string
    sort: CourseSortOption
  }>({
    universityId:
      initialType === "courses" && initialFilters?.universityId
        ? initialFilters.universityId
        : ALL_OPTION,
    departmentId:
      initialType === "courses" && initialFilters?.departmentId
        ? initialFilters.departmentId
        : ALL_OPTION,
    sort:
      initialType === "courses"
        ? (initialFilters?.sort as CourseSortOption) || "code-asc"
        : "code-asc",
  })

  // Sync state if initial props change
  const [prevInitial, setPrevInitial] = React.useState({
    initialQuery,
    initialType,
    initialData,
  })
  if (
    prevInitial.initialQuery !== initialQuery ||
    prevInitial.initialType !== initialType ||
    prevInitial.initialData !== initialData
  ) {
    setPrevInitial({ initialQuery, initialType, initialData })
    setQueryInput(initialQuery)
    setActiveTab(initialType)
    setResults(initialData)
  }

  const resetAllFilterStates = () => {
    setMaterialFilters({
      courseMaterialType: null,
      universityId: null,
      courseId: null,
    })
    setQuestionFilters({
      sort: "newest",
      universityId: null,
      courseId: null,
    })
    setCourseFilters({
      universityId: ALL_OPTION,
      departmentId: ALL_OPTION,
      sort: "code-asc",
    })
  }

  const executeSearch = async (
    query: string,
    type: SearchType,
    filters: SearchFilterParams = {}
  ) => {
    setIsLoading(true)
    setError(null)
    try {
      if (!query.trim()) {
        setResults(emptySearchResponse(type))
        return
      }

      const res = await client.api.search.$get({
        query: {
          q: query.trim(),
          type,
          universityId: filters.universityId || undefined,
          departmentId: filters.departmentId || undefined,
          courseId: filters.courseId || undefined,
          courseMaterialType: filters.courseMaterialType || undefined,
          sort: filters.sort || undefined,
        },
      })
      if (!res.ok) throw new Error("Search failed")
      const data = (await res.json()) as SearchResponse
      setResults(data)
    } catch {
      setError("Failed to fetch search results. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const applyTabSearch = async (
    tab: SearchType,
    filters: SearchFilterParams = {},
    queryOverride?: string
  ) => {
    const trimmed = (queryOverride ?? results.query).trim()
    router.replace(buildSearchPageUrl(trimmed, tab, filters), { scroll: false })
    if (trimmed || queryOverride !== undefined) {
      await executeSearch(trimmed, tab, filters)
    }
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = queryInput.trim()
    resetAllFilterStates()
    await applyTabSearch(activeTab, {}, trimmed)
  }

  // Q1:C - Tab switch clears all filters back to ?q=...&type=...
  const handleTabChange = async (newTab: SearchType) => {
    setActiveTab(newTab)
    resetAllFilterStates()
    await applyTabSearch(newTab, {})
  }

  // --- Course Materials Filter Handlers ---
  const updateMaterialFilters = async (
    next: Partial<typeof materialFilters>
  ) => {
    const updated = { ...materialFilters, ...next }
    setMaterialFilters(updated)
    await applyTabSearch("course-materials", {
      courseMaterialType: updated.courseMaterialType,
      universityId: updated.universityId,
      courseId: updated.courseId,
    })
  }

  const handleResetMaterialFilters = async () => {
    const reset = {
      courseMaterialType: null,
      universityId: null,
      courseId: null,
    }
    setMaterialFilters(reset)
    await applyTabSearch("course-materials", {})
  }

  const hasActiveMaterialFilters = Boolean(
    materialFilters.courseMaterialType ||
    materialFilters.universityId ||
    materialFilters.courseId
  )

  // --- Questions Filter Handlers ---
  const updateQuestionFilters = async (
    next: Partial<typeof questionFilters>
  ) => {
    const updated = { ...questionFilters, ...next }
    setQuestionFilters(updated)
    await applyTabSearch("questions", {
      sort: updated.sort !== "newest" ? updated.sort : null,
      universityId: updated.universityId,
      courseId: updated.courseId,
    })
  }

  const handleResetQuestionFilters = async () => {
    const reset = {
      sort: "newest" as QuestionSort,
      universityId: null,
      courseId: null,
    }
    setQuestionFilters(reset)
    await applyTabSearch("questions", {})
  }

  const hasActiveQuestionFilters = Boolean(
    questionFilters.sort !== "newest" ||
    questionFilters.universityId ||
    questionFilters.courseId
  )

  // --- Courses Filter Handlers ---
  const availableCourseDepartments = React.useMemo(() => {
    return getAvailableDepartments(departments, courseFilters.universityId)
  }, [departments, courseFilters.universityId])

  const updateCourseFilters = async (next: Partial<typeof courseFilters>) => {
    const updated = { ...courseFilters, ...next }
    if (
      next.universityId !== undefined &&
      updated.departmentId !== ALL_OPTION &&
      !isDepartmentCompatibleWithUniversity(
        departments,
        updated.departmentId,
        updated.universityId
      )
    ) {
      updated.departmentId = ALL_OPTION
    }
    setCourseFilters(updated)
    await applyTabSearch("courses", {
      universityId:
        updated.universityId !== ALL_OPTION ? updated.universityId : null,
      departmentId:
        updated.departmentId !== ALL_OPTION ? updated.departmentId : null,
      sort: updated.sort !== "code-asc" ? updated.sort : null,
    })
  }

  const handleResetCourseFilters = async () => {
    setCourseFilters({
      universityId: ALL_OPTION,
      departmentId: ALL_OPTION,
      sort: "code-asc",
    })
    await applyTabSearch("courses", {})
  }

  const hasActiveCourseFilters = Boolean(
    courseFilters.universityId !== ALL_OPTION ||
    courseFilters.departmentId !== ALL_OPTION ||
    courseFilters.sort !== "code-asc"
  )

  const selectedCourseUniName =
    courseFilters.universityId !== ALL_OPTION
      ? (universities.find((u) => u.id === courseFilters.universityId)?.name ??
        null)
      : null

  const selectedCourseDeptName =
    courseFilters.departmentId !== ALL_OPTION
      ? (departments.find((d) => d.id === courseFilters.departmentId)?.name ??
        null)
      : null

  const emptyState = getSearchEmptyState(
    results.query,
    activeTab,
    activeTab === "course-materials"
      ? hasActiveMaterialFilters
      : activeTab === "questions"
        ? hasActiveQuestionFilters
        : activeTab === "courses"
          ? hasActiveCourseFilters
          : false
  )

  const hasNoResults =
    results.query.trim().length > 0 && results.counts.all === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Search Input Bar */}
      <form
        action="/search"
        method="GET"
        onSubmit={handleSearchSubmit}
        role="search"
        className="relative flex w-full items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search course materials, questions, course codes..."
            className="h-11 w-full rounded-lg pr-4 pl-11 text-base shadow-xs md:text-sm"
            aria-label="Search across platform"
            data-testid="search-page-input"
          />
        </div>
        <Button
          type="submit"
          className="h-11 px-6 font-medium"
          disabled={isLoading}
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </form>

      {/* Tabs - Badges always show total unfiltered query matches */}
      <div className="border-b border-border">
        <nav
          className="-mb-px flex flex-wrap gap-6"
          aria-label="Search results tabs"
        >
          <TabButton
            active={activeTab === "all"}
            onClick={() => handleTabChange("all")}
            label="All"
            count={results.counts.all}
            testId="tab-all"
          />
          <TabButton
            active={activeTab === "course-materials"}
            onClick={() => handleTabChange("course-materials")}
            label="Course Materials"
            count={results.counts.courseMaterials}
            testId="tab-course-materials"
          />
          <TabButton
            active={activeTab === "questions"}
            onClick={() => handleTabChange("questions")}
            label="Questions"
            count={results.counts.questions}
            testId="tab-questions"
          />
          <TabButton
            active={activeTab === "courses"}
            onClick={() => handleTabChange("courses")}
            label="Courses"
            count={results.counts.courses ?? 0}
            testId="tab-courses"
          />
        </nav>
      </div>

      {/* Tab-Specific Filters Bar (mirroring dedicated pages) */}
      {/* 1. Course Materials Filters (mirrors /course-materials) */}
      {activeTab === "course-materials" && (
        <section
          className="flex flex-col gap-3"
          aria-label="Filter course materials"
        >
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={2}
              value={[materialFilters.courseMaterialType ?? ALL_MATERIAL_TYPE]}
              onValueChange={(next) => {
                const selected = next[0]
                if (!selected || selected === ALL_MATERIAL_TYPE) {
                  updateMaterialFilters({ courseMaterialType: null })
                } else {
                  const match = courseMaterialTypeOptions.find(
                    (option) => option.value === selected
                  )
                  updateMaterialFilters({
                    courseMaterialType: match?.value ?? null,
                  })
                }
              }}
              className="flex max-w-full flex-wrap"
              aria-label="Filter by course material type"
            >
              <ToggleGroupItem
                value={ALL_MATERIAL_TYPE}
                aria-label="All types"
                className={ACTIVE_TOGGLE_CLASSES}
              >
                All
              </ToggleGroupItem>
              {courseMaterialTypeOptions.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  aria-label={option.label}
                  className={ACTIVE_TOGGLE_CLASSES}
                >
                  {courseMaterialTypePillLabels[option.value]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <CourseFilterDropdown
              universities={universities}
              courses={courses}
              selectedUniversityId={materialFilters.universityId}
              selectedCourseId={materialFilters.courseId}
              onFilterChange={({ universityId, courseId }) =>
                updateMaterialFilters({ universityId, courseId })
              }
            />
          </div>

          {hasActiveMaterialFilters && (
            <div className="text-xs text-muted-foreground">
              Showing{" "}
              <strong className="font-semibold text-foreground">
                {results.courseMaterials.length}
              </strong>{" "}
              of {results.counts.courseMaterials} course materials
            </div>
          )}
        </section>
      )}

      {/* 2. Questions Filters (mirrors /questions) */}
      {activeTab === "questions" && (
        <section className="flex flex-col gap-3" aria-label="Filter questions">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={2}
              value={[questionFilters.sort]}
              onValueChange={(next) => {
                const selected = next[0] as QuestionSort | undefined
                const match = QUESTION_SORT_OPTIONS.find(
                  (option) => option.value === selected
                )
                if (!match) return
                updateQuestionFilters({ sort: match.value })
              }}
              className="flex max-w-full flex-wrap"
              aria-label="Sort questions"
            >
              {QUESTION_SORT_OPTIONS.map((option) => (
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
              selectedUniversityId={questionFilters.universityId}
              selectedCourseId={questionFilters.courseId}
              onFilterChange={({ universityId, courseId }) =>
                updateQuestionFilters({ universityId, courseId })
              }
            />
          </div>

          {hasActiveQuestionFilters && (
            <div className="text-xs text-muted-foreground">
              Showing{" "}
              <strong className="font-semibold text-foreground">
                {results.questions.length}
              </strong>{" "}
              of {results.counts.questions} questions
            </div>
          )}
        </section>
      )}

      {/* 3. Courses Filters (mirrors /courses) */}
      {activeTab === "courses" && (
        <section
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"
          aria-label="Course Filters"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* University Picker */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="course-university-select"
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80"
              >
                <GraduationCap className="size-3.5 text-primary" />
                <span>University</span>
              </label>
              <Select
                value={courseFilters.universityId}
                onValueChange={(val) =>
                  updateCourseFilters({ universityId: val ?? ALL_OPTION })
                }
              >
                <SelectTrigger
                  id="course-university-select"
                  className="w-full"
                  data-testid="search-university-select"
                >
                  <div className="flex items-center gap-2 truncate">
                    <GraduationCap className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <SelectValue placeholder="All Universities" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_OPTION}>All Universities</SelectItem>
                    {universities.map((uni) => (
                      <SelectItem key={uni.id} value={uni.id}>
                        {uni.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Cascading Department Picker */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="course-department-select"
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80"
              >
                <BookOpen className="size-3.5 text-primary" />
                <span>Department</span>
                {selectedCourseUniName ? (
                  <span className="text-[10px] font-normal text-muted-foreground">
                    (filtered)
                  </span>
                ) : null}
              </label>
              <Select
                value={courseFilters.departmentId}
                onValueChange={(val) =>
                  updateCourseFilters({ departmentId: val ?? ALL_OPTION })
                }
              >
                <SelectTrigger
                  id="course-department-select"
                  className="w-full"
                  data-testid="search-department-select"
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <SelectValue placeholder="All Departments" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_OPTION}>All Departments</SelectItem>
                    {availableCourseDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By Dropdown */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="course-sort-select"
                  className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80"
                >
                  <ArrowUpDown className="size-3.5 text-primary" />
                  <span>Sort By</span>
                </label>
                {hasActiveCourseFilters ? (
                  <button
                    type="button"
                    onClick={handleResetCourseFilters}
                    className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3" />
                    <span>Reset</span>
                  </button>
                ) : null}
              </div>
              <Select
                value={courseFilters.sort}
                onValueChange={(val) =>
                  updateCourseFilters({
                    sort: (val as CourseSortOption) ?? "code-asc",
                  })
                }
              >
                <SelectTrigger
                  id="course-sort-select"
                  className="w-full"
                  data-testid="search-course-sort-select"
                >
                  <div className="flex items-center gap-2 truncate">
                    <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="code-asc">Code (A–Z)</SelectItem>
                    <SelectItem value="materials-desc">
                      Most Materials
                    </SelectItem>
                    <SelectItem value="qa-desc">Most Active Q&amp;A</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Info & Active Filter Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Showing{" "}
                <strong className="font-semibold text-foreground">
                  {results.courses?.length ?? 0}
                </strong>{" "}
                of {results.counts.courses ?? 0} courses
              </span>

              {selectedCourseUniName ? (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 text-[11px] font-normal"
                >
                  <GraduationCap className="size-3 text-primary" />
                  <span>Uni: {selectedCourseUniName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateCourseFilters({ universityId: ALL_OPTION })
                    }
                    className="ml-0.5 rounded hover:text-foreground"
                    aria-label="Remove university filter"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ) : null}

              {selectedCourseDeptName ? (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 text-[11px] font-normal"
                >
                  <BookOpen className="size-3 text-primary" />
                  <span>Dept: {selectedCourseDeptName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateCourseFilters({ departmentId: ALL_OPTION })
                    }
                    className="ml-0.5 rounded hover:text-foreground"
                    aria-label="Remove department filter"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ) : null}
            </div>

            {hasActiveCourseFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetCourseFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="mr-1 size-3" />
                Clear all
              </Button>
            ) : null}
          </div>
        </section>
      )}

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-border bg-muted/30"
            />
          ))}
        </div>
      )}

      {/* Results Content */}
      {!isLoading && (
        <>
          {/* Empty / Zero-Results State */}
          {!results.query.trim() || hasNoResults ? (
            <div
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center"
              data-testid="search-empty-state"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Search className="size-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {emptyState.title}
              </h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {emptyState.description}
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {/* "All" Tab: Shows Course Materials, Questions, Courses (capped at 6 items per type) */}
              {activeTab === "all" && (
                <>
                  {results.courseMaterials.length > 0 && (
                    <section aria-labelledby="course-materials-section-heading">
                      <div className="mb-4 flex items-center gap-2">
                        <BookOpen className="size-5 text-primary" />
                        <h2
                          id="course-materials-section-heading"
                          className="text-lg font-bold text-foreground"
                        >
                          Course Materials
                        </h2>
                        <Badge variant="secondary">
                          {results.counts.courseMaterials}
                        </Badge>
                      </div>
                      <CourseMaterialGrid
                        courseMaterials={results.courseMaterials.slice(
                          0,
                          ALL_TAB_PREVIEW_LIMIT
                        )}
                      />
                      {results.counts.courseMaterials >
                        ALL_TAB_PREVIEW_LIMIT && (
                        <div className="mt-4 flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleTabChange("course-materials")}
                            data-testid="view-more-course-materials"
                          >
                            View more
                            <ArrowRight className="ml-1.5 size-4" />
                          </Button>
                        </div>
                      )}
                    </section>
                  )}

                  {results.questions.length > 0 && (
                    <section aria-labelledby="questions-section-heading">
                      <div className="mb-4 flex items-center gap-2">
                        <MessageSquareQuote className="size-5 text-primary" />
                        <h2
                          id="questions-section-heading"
                          className="text-lg font-bold text-foreground"
                        >
                          Questions
                        </h2>
                        <Badge variant="secondary">
                          {results.counts.questions}
                        </Badge>
                      </div>
                      <QuestionGrid
                        questions={results.questions.slice(
                          0,
                          ALL_TAB_PREVIEW_LIMIT
                        )}
                      />
                      {results.counts.questions > ALL_TAB_PREVIEW_LIMIT && (
                        <div className="mt-4 flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleTabChange("questions")}
                            data-testid="view-more-questions"
                          >
                            View more
                            <ArrowRight className="ml-1.5 size-4" />
                          </Button>
                        </div>
                      )}
                    </section>
                  )}

                  {results.courses && results.courses.length > 0 && (
                    <section aria-labelledby="courses-section-heading">
                      <div className="mb-4 flex items-center gap-2">
                        <GraduationCap className="size-5 text-primary" />
                        <h2
                          id="courses-section-heading"
                          className="text-lg font-bold text-foreground"
                        >
                          Courses
                        </h2>
                        <Badge variant="secondary">
                          {results.counts.courses}
                        </Badge>
                      </div>
                      <CourseGrid
                        courses={results.courses.slice(
                          0,
                          ALL_TAB_PREVIEW_LIMIT
                        )}
                      />
                      {results.counts.courses > ALL_TAB_PREVIEW_LIMIT && (
                        <div className="mt-4 flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleTabChange("courses")}
                            data-testid="view-more-courses"
                          >
                            View more
                            <ArrowRight className="ml-1.5 size-4" />
                          </Button>
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}

              {/* Dedicated "Course Materials" Tab */}
              {activeTab === "course-materials" && (
                <section aria-labelledby="course-materials-tab-heading">
                  <h2 id="course-materials-tab-heading" className="sr-only">
                    Course material search results
                  </h2>
                  {results.courseMaterials.length === 0 ? (
                    <div
                      className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-6 py-10"
                      data-testid="search-course-materials-empty-state"
                    >
                      <h3 className="text-base font-semibold text-foreground">
                        {emptyState.title}
                      </h3>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {emptyState.description}
                      </p>
                      {hasActiveMaterialFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetMaterialFilters}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <CourseMaterialGrid
                      courseMaterials={results.courseMaterials}
                    />
                  )}
                </section>
              )}

              {/* Dedicated "Questions" Tab */}
              {activeTab === "questions" && (
                <section aria-labelledby="questions-tab-heading">
                  <h2 id="questions-tab-heading" className="sr-only">
                    Question search results
                  </h2>
                  {results.questions.length === 0 ? (
                    <div
                      className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-6 py-10"
                      data-testid="search-questions-empty-state"
                    >
                      <h3 className="text-base font-semibold text-foreground">
                        {emptyState.title}
                      </h3>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {emptyState.description}
                      </p>
                      {hasActiveQuestionFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetQuestionFilters}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <QuestionGrid questions={results.questions} />
                  )}
                </section>
              )}

              {/* Dedicated "Courses" Tab */}
              {activeTab === "courses" && (
                <section aria-labelledby="courses-tab-heading">
                  <h2 id="courses-tab-heading" className="sr-only">
                    Course search results
                  </h2>
                  {!results.courses || results.courses.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center"
                      data-testid="search-courses-empty-state"
                    >
                      <SlidersHorizontal className="mb-3 size-10 text-muted-foreground/60" />
                      <h3 className="text-base font-semibold text-foreground">
                        {emptyState.title}
                      </h3>
                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        {emptyState.description}
                      </p>
                      {hasActiveCourseFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetCourseFilters}
                          className="mt-4"
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <CourseGrid courses={results.courses} />
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  count,
  testId,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  testId: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
      }`}
      data-testid={testId}
    >
      <span>{label}</span>
      <Badge
        variant={active ? "default" : "secondary"}
        className="rounded-full px-2 py-0.5 text-xs font-semibold"
      >
        {count}
      </Badge>
    </button>
  )
}

function CourseMaterialGrid({
  courseMaterials,
}: {
  courseMaterials: SearchResultCourseMaterial[]
}) {
  return (
    <ul
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="search-course-materials-grid"
    >
      {courseMaterials.map((item) => {
        const materialType = item.courseMaterialType ?? "other"
        const typeLabel =
          courseMaterialTypePillLabels[materialType as CourseMaterialType] ??
          materialType

        return (
          <li key={item.id}>
            <Link
              href={`/course-materials/${item.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-all hover:border-foreground/20 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              data-testid={`search-course-material-card-${item.id}`}
            >
              {/* Thumbnail / Icon area matching /course-materials */}
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted/50">
                {item.thumbnailPath ? (
                  <Image
                    src={`/api/course-materials/${item.id}/thumbnail`}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    <CourseMaterialTypeIcon courseMaterialType={materialType} />
                  </div>
                )}
              </div>

              {/* Content matching /course-materials */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                  {item.title}
                </h3>

                <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {item.universityName ? (
                    <>
                      <span className="truncate font-medium text-foreground/80">
                        {item.universityName}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground/50"
                      >
                        ·
                      </span>
                    </>
                  ) : null}
                  <Badge
                    variant="secondary"
                    className="shrink-0 font-mono text-[11px]"
                  >
                    {item.courseCode}
                  </Badge>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {typeLabel}
                  </Badge>
                  <time dateTime={item.createdAt}>
                    {formatRelativeUploadDate(item.createdAt)}
                  </time>
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function QuestionGrid({ questions }: { questions: SearchResultQuestion[] }) {
  return (
    <ul
      className="flex max-w-4xl flex-col gap-4"
      data-testid="search-questions-grid"
    >
      {questions.map((item) => (
        <li key={item.id}>
          <article
            className="group flex gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-foreground/20 hover:shadow-md"
            data-testid={`search-question-card-${item.id}`}
          >
            <div className="flex shrink-0 flex-col items-center justify-start pt-0.5">
              <VoteControls
                targetType="question"
                targetId={item.id}
                initialScore={item.voteScore}
                initialUserVote={item.userVote}
                orientation="vertical"
                size="sm"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {item.universityName ? (
                    <>
                      <span className="truncate font-medium text-foreground/80">
                        {item.universityName}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground/50"
                      >
                        ·
                      </span>
                    </>
                  ) : null}
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {item.courseCode}
                  </Badge>
                </div>

                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    item.answerCount > 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <MessageCircle className="size-3.5" aria-hidden="true" />
                  <span>
                    {item.answerCount}{" "}
                    {item.answerCount === 1 ? "answer" : "answers"}
                  </span>
                </span>
              </div>

              <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                <Link
                  href={`/questions/${item.id}`}
                  className="hover:underline"
                >
                  {item.title}
                </Link>
              </h3>

              <p className="line-clamp-2 text-sm text-muted-foreground">
                {item.body}
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {item.studentName}
                </span>
                <time dateTime={item.createdAt}>
                  {formatRelativeUploadDate(item.createdAt)}
                </time>
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}

function CourseGrid({ courses }: { courses: SearchResultCourse[] }) {
  return (
    <div
      className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      data-testid="search-courses-grid"
    >
      {courses.map((course) => {
        const materialsMeta = formatMaterialsCount(course.materialsCount)
        const questionsMeta = formatQuestionsCount(course.questionsCount)

        return (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            data-testid={`search-course-card-${course.code}`}
            className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          >
            <div>
              {/* University & Department Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pb-3">
                <Badge
                  variant="secondary"
                  className="max-w-[170px] truncate text-[11px] font-normal"
                >
                  {course.universityName}
                </Badge>
                <Badge
                  variant="outline"
                  className="max-w-[150px] truncate text-[11px] font-normal text-muted-foreground"
                >
                  {course.departmentName}
                </Badge>
              </div>

              {/* Course Code & Name */}
              <div className="space-y-1">
                <h3 className="font-mono text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                  {course.code}
                </h3>
                <p className="line-clamp-2 text-sm font-medium text-foreground/90">
                  {course.name}
                </p>
              </div>
            </div>

            {/* Stats & Activity Counters */}
            <div className="mt-5 border-t border-border/60 pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Course Materials Counter */}
                  <span
                    data-testid="materials-counter"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                      materialsMeta.isZero
                        ? "bg-muted text-muted-foreground"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                    )}
                  >
                    <FileText className="size-3" />
                    <span>{materialsMeta.label}</span>
                  </span>

                  {/* Q&A Counter */}
                  <span
                    data-testid="qa-counter"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                      questionsMeta.isZero
                        ? "bg-muted text-muted-foreground"
                        : "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400"
                    )}
                  >
                    <MessageSquare className="size-3" />
                    <span>{questionsMeta.label}</span>
                  </span>
                </div>

                <span className="flex items-center text-xs font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
