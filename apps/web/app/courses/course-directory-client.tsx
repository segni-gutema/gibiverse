"use client"

import * as React from "react"
import Link from "next/link"
import {
  LayoutGrid,
  LayoutList,
  Search,
  X,
  FileText,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
  Download,
  Eye,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { cn } from "@gibiverse/ui/lib/utils"
import { Button } from "@gibiverse/ui/components/button"
import { Badge } from "@gibiverse/ui/components/badge"
import { Input } from "@gibiverse/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@gibiverse/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gibiverse/ui/components/select"
import { CoursePicker } from "@/components/course-picker"
import {
  groupCoursesByDepartment,
  filterPrototypeCourses,
  getAvailableDepartments,
  isDepartmentCompatibleWithUniversity,
  formatMaterialsCount,
  formatQuestionsCount,
  PROTOTYPE_COURSES,
  PROTOTYPE_UNIVERSITIES,
  PROTOTYPE_DEPARTMENTS,
  type Course,
  type CourseSummary,
  type Department,
  type University,
  type CourseCardData,
  type CourseSortOption,
} from "./presentation"

const ALL_OPTION = "__all__"

export function CourseDirectoryClient({
  universities = [],
  departments = [],
  courses = [],
}: {
  universities?: University[]
  departments: Department[]
  courses: (CourseSummary | Course)[]
}) {
  // View Switcher: default to live card grid mode
  const [viewMode, setViewMode] = React.useState<"grid" | "prototype" | "legacy">(
    "grid"
  )

  // Legacy state
  const [selectedLegacyCourseId, setSelectedLegacyCourseId] = React.useState<
    string | null
  >(null)

  // Grid filters state
  const [selectedUniversityId, setSelectedUniversityId] =
    React.useState<string>(ALL_OPTION)
  const [selectedDepartmentId, setSelectedDepartmentId] =
    React.useState<string>(ALL_OPTION)
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [sortBy, setSortBy] = React.useState<CourseSortOption>("code-asc")

  // Interactive Prototype details modal state
  const [previewCourse, setPreviewCourse] =
    React.useState<CourseCardData | null>(null)
  const [activeTab, setActiveTab] = React.useState<"materials" | "qa">(
    "materials"
  )
  const [actionNotice, setActionNotice] = React.useState<string | null>(null)

  // Normalize live courses
  const liveNormalizedCourses: CourseCardData[] = React.useMemo(() => {
    return courses.map((c) => {
      const card = c as Partial<CourseCardData>
      const uName =
        card.universityName ||
        universities.find((u) => u.id === c.universityId)?.name ||
        ""
      const dName =
        card.departmentName ||
        departments.find((d) => d.id === c.departmentId)?.name ||
        ""
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        universityId: c.universityId,
        universityName: uName,
        departmentId: c.departmentId,
        departmentName: dName,
        materialsCount: Number(card.materialsCount ?? 0),
        questionsCount: Number(card.questionsCount ?? 0),
      }
    })
  }, [courses, universities, departments])

  // Dataset resolution: merge prototype data with any passed records
  const allUniversities = React.useMemo(() => {
    const map = new Map<string, University>()
    for (const u of PROTOTYPE_UNIVERSITIES) map.set(u.id, u)
    for (const u of universities) map.set(u.id, u)
    return Array.from(map.values())
  }, [universities])

  const allDepartments = React.useMemo(() => {
    const map = new Map<string, Department>()
    for (const d of PROTOTYPE_DEPARTMENTS) map.set(d.id, d)
    for (const d of departments) map.set(d.id, d)
    return Array.from(map.values())
  }, [departments])

  const availableDepartments = React.useMemo(() => {
    return getAvailableDepartments(allDepartments, selectedUniversityId)
  }, [allDepartments, selectedUniversityId])

  // Active dataset for grid / prototype
  const currentDataset = React.useMemo(() => {
    if (viewMode === "prototype") return PROTOTYPE_COURSES
    return liveNormalizedCourses.length > 0
      ? liveNormalizedCourses
      : PROTOTYPE_COURSES
  }, [viewMode, liveNormalizedCourses])

  // Handle university change with cascading auto-reset
  const handleUniversityChange = (newUnivId: string) => {
    setSelectedUniversityId(newUnivId)
    if (
      selectedDepartmentId !== ALL_OPTION &&
      !isDepartmentCompatibleWithUniversity(
        allDepartments,
        selectedDepartmentId,
        newUnivId
      )
    ) {
      setSelectedDepartmentId(ALL_OPTION)
    }
  }

  // Filtered & sorted courses
  const filteredCourses = React.useMemo(() => {
    return filterPrototypeCourses(currentDataset, {
      universityId: selectedUniversityId,
      departmentId: selectedDepartmentId,
      searchQuery,
      sortBy,
    })
  }, [currentDataset, selectedUniversityId, selectedDepartmentId, searchQuery, sortBy])

  const hasActiveFilters =
    selectedUniversityId !== ALL_OPTION ||
    selectedDepartmentId !== ALL_OPTION ||
    searchQuery.trim().length > 0 ||
    sortBy !== "code-asc"

  const handleResetFilters = () => {
    setSelectedUniversityId(ALL_OPTION)
    setSelectedDepartmentId(ALL_OPTION)
    setSearchQuery("")
    setSortBy("code-asc")
  }

  // Legacy grouped data
  const legacySelectedCourse =
    courses.find((c) => c.id === selectedLegacyCourseId) ?? null
  const legacyGrouped = groupCoursesByDepartment(departments, courses)

  return (
    <div className="flex flex-col gap-8">
      {/* View Switcher Header Bar */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
        aria-label="Catalog View Switcher"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Catalog Display Mode
              </h2>
              <Badge
                variant={
                  viewMode === "grid"
                    ? "default"
                    : viewMode === "prototype"
                      ? "outline"
                      : "secondary"
                }
                className="text-[10px] tracking-wide uppercase"
              >
                {viewMode === "grid"
                  ? "Card Grid"
                  : viewMode === "prototype"
                    ? "Prototype Preview"
                    : "Legacy Directory"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === "grid"
                ? "Interactive 3-column card grid with live filters, metrics, and course links."
                : viewMode === "prototype"
                  ? "Prototype evaluation mode with simulated course data and interactive modal previews."
                  : "Grouped academic department lists with standard course picker."}
            </p>
          </div>
        </div>

        <div className="flex items-center rounded-xl border border-border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              viewMode === "grid"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="view-switcher-grid"
          >
            <LayoutGrid className="size-3.5" />
            <span>Card Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("prototype")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              viewMode === "prototype"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="view-switcher-prototype"
          >
            <Sparkles className="size-3.5" />
            <span>Prototype Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("legacy")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              viewMode === "legacy"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="view-switcher-legacy"
          >
            <LayoutList className="size-3.5" />
            <span>Legacy View</span>
          </button>
        </div>
      </section>

      {/* VIEW MODE: CARD GRID OR PROTOTYPE */}
      {viewMode === "grid" || viewMode === "prototype" ? (
        <div className="flex flex-col gap-6">
          {/* Filters & Search Toolbar */}
          <section
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs"
            aria-label="Course Filters"
          >
            <div className="flex flex-wrap items-center gap-3">
              {/* Search input */}
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search courses by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8"
                  data-testid="course-search-input"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              {/* University dropdown */}
              <div className="w-full sm:w-56">
                <Select
                  value={selectedUniversityId}
                  onValueChange={(val) =>
                    handleUniversityChange(val ?? ALL_OPTION)
                  }
                >
                  <SelectTrigger className="w-full" data-testid="university-select">
                    <SelectValue placeholder="All Universities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={ALL_OPTION}>All Universities</SelectItem>
                      {allUniversities.map((uni) => (
                        <SelectItem key={uni.id} value={uni.id}>
                          {uni.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Cascading Department dropdown */}
              <div className="w-full sm:w-56">
                <Select
                  value={selectedDepartmentId}
                  onValueChange={(val) =>
                    setSelectedDepartmentId(val ?? ALL_OPTION)
                  }
                >
                  <SelectTrigger className="w-full" data-testid="department-select">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={ALL_OPTION}>All Departments</SelectItem>
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort dropdown */}
              <div className="w-full sm:w-48">
                <Select
                  value={sortBy}
                  onValueChange={(val) =>
                    setSortBy((val as CourseSortOption) ?? "code-asc")
                  }
                >
                  <SelectTrigger className="w-full" data-testid="sort-select">
                    <SelectValue placeholder="Sort by" />
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

              {/* Reset filters button */}
              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="reset-filters-button"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset</span>
                </Button>
              ) : null}
            </div>

            {/* Results count info */}
            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span>
                Showing{" "}
                <strong className="font-semibold text-foreground">
                  {filteredCourses.length}
                </strong>{" "}
                {filteredCourses.length === 1 ? "course" : "courses"}
              </span>
              {selectedUniversityId !== ALL_OPTION ? (
                <span className="truncate">
                  University:{" "}
                  <strong className="text-foreground">
                    {allUniversities.find((u) => u.id === selectedUniversityId)
                      ?.name ?? selectedUniversityId}
                  </strong>
                </span>
              ) : null}
            </div>
          </section>

          {/* 3-Column Responsive Course Card Grid */}
          {filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <SlidersHorizontal className="mb-3 size-10 text-muted-foreground/60" />
              <h3 className="text-base font-semibold text-foreground">
                No courses found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                No courses match the active filters. Try resetting the filters or
                choosing another university or department.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-4"
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => {
                const materialsMeta = formatMaterialsCount(
                  course.materialsCount
                )
                const questionsMeta = formatQuestionsCount(
                  course.questionsCount
                )

                const cardInner = (
                  <>
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
                          {/* Course Materials Counter: Neutral/muted when 0 */}
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

                          {/* Q&A Counter: Neutral/muted when 0 */}
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

                        <span className="flex items-center text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                          <ArrowRight className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  </>
                )

                if (viewMode === "grid") {
                  return (
                    <Link
                      key={course.id}
                      href={`/courses/${course.id}`}
                      data-testid={`course-card-${course.code}`}
                      className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                    >
                      {cardInner}
                    </Link>
                  )
                }

                return (
                  <div
                    key={course.id}
                    data-testid={`course-card-${course.code}`}
                    onClick={() => {
                      setPreviewCourse(course)
                      setActiveTab("materials")
                      setActionNotice(null)
                    }}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                  >
                    {cardInner}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE: LEGACY DIRECTORY */
        <div className="flex flex-col gap-10">
          <section
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6"
            aria-labelledby="picker-heading"
          >
            <div>
              <h2
                id="picker-heading"
                className="text-lg font-semibold text-foreground"
              >
                Find a course
              </h2>
              <p className="text-sm text-muted-foreground">
                Filter by university, then select a course. This picker is reused
                when uploading course materials or asking questions.
              </p>
            </div>
            <CoursePicker
              universities={allUniversities}
              courses={courses}
              courseId={selectedLegacyCourseId}
              onCourseChange={setSelectedLegacyCourseId}
            />
            {legacySelectedCourse ? (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <p
                  className="text-sm text-foreground"
                  data-testid="selected-course-summary"
                >
                  Selected:{" "}
                  <span className="font-medium">
                    {legacySelectedCourse.code} — {legacySelectedCourse.name}
                  </span>
                </p>
                <Link
                  href={`/course-materials?courseId=${legacySelectedCourse.id}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Course Materials →
                </Link>
              </div>
            ) : null}
          </section>

          <section
            className="flex flex-col gap-6"
            aria-labelledby="catalog-heading"
          >
            <h2
              id="catalog-heading"
              className="text-lg font-semibold text-foreground"
            >
              Departments &amp; courses
            </h2>

            {legacyGrouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No departments have been seeded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-8">
                {legacyGrouped.map((department) => (
                  <div
                    key={department.id}
                    className="flex flex-col gap-3"
                    data-testid={`department-section-${department.id}`}
                  >
                    <h3 className="text-base font-semibold text-foreground">
                      {department.name}
                    </h3>
                    {department.courses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No courses offered yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border rounded-lg border border-border">
                        {department.courses.map((course) => (
                          <li
                            key={course.id}
                            className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3"
                            data-testid={`course-row-${course.code}`}
                          >
                            <Link
                              href={`/course-materials?courseId=${course.id}`}
                              className="font-mono text-sm font-semibold text-primary hover:underline"
                            >
                              {course.code}
                            </Link>
                            <span className="text-sm text-foreground">
                              {course.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Interactive Prototype Details Modal */}
      {previewCourse ? (
        <Dialog
          open={Boolean(previewCourse)}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewCourse(null)
              setActionNotice(null)
            }
          }}
        >
          <DialogContent
            className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
            data-testid="prototype-details-modal"
          >
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <Badge variant="secondary" className="text-xs">
                  {previewCourse.universityName}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {previewCourse.departmentName}
                </Badge>
              </div>
              <DialogTitle className="font-mono text-xl font-bold">
                {previewCourse.code}: {previewCourse.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Explore scoped materials and academic Q&amp;A for this course.
              </DialogDescription>
            </DialogHeader>

            {/* Quick action notice if simulated */}
            {actionNotice ? (
              <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                {actionNotice}
              </div>
            ) : null}

            {/* Tabs Bar */}
            <div className="border-b border-border">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("materials")
                    setActionNotice(null)
                  }}
                  data-testid="tab-materials"
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
                    activeTab === "materials"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="size-3.5" />
                  <span>Course Materials</span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {previewCourse.materialsCount}
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("qa")
                    setActionNotice(null)
                  }}
                  data-testid="tab-qa"
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
                    activeTab === "qa"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="size-3.5" />
                  <span>Q&amp;A</span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {previewCourse.questionsCount}
                  </Badge>
                </button>
              </div>
            </div>

            {/* Tab 1: Course Materials */}
            {activeTab === "materials" ? (
              <div className="space-y-3 py-2">
                {previewCourse.materials && previewCourse.materials.length > 0 ? (
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {previewCourse.materials.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {item.title}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase text-muted-foreground"
                            >
                              {item.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>{item.academicPeriod}</span>
                            {item.fileSize ? <span>• {item.fileSize}</span> : null}
                            {item.uploadedAt ? (
                              <span>• {item.uploadedAt}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setActionNotice(
                                `Simulated preview opened for: "${item.title}"`
                              )
                            }
                          >
                            <Eye className="mr-1 size-3" />
                            Preview
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setActionNotice(
                                `Simulated download initiated for: "${item.title}"`
                              )
                            }
                          >
                            <Download className="mr-1 size-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center">
                    <FileText className="size-8 text-muted-foreground/50" />
                    <p className="mt-2 text-xs font-medium text-foreground">
                      No course materials uploaded yet for {previewCourse.code}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Be the first student to share lecture notes, exam papers, or
                      lab guides.
                    </p>
                    <Link
                      href={`/course-materials?courseId=${previewCourse.id}`}
                      className="mt-3 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Upload Material
                    </Link>
                  </div>
                )}
              </div>
            ) : null}

            {/* Tab 2: Q&A */}
            {activeTab === "qa" ? (
              <div className="space-y-3 py-2">
                {previewCourse.questions && previewCourse.questions.length > 0 ? (
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {previewCourse.questions.map((q) => (
                      <div
                        key={q.id}
                        className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {q.title}
                            </span>
                            {q.hasAcceptedAnswer ? (
                              <Badge className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="mr-1 size-2.5" />
                                Accepted Answer
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>{q.votes} votes</span>
                            <span>• {q.answersCount} answers</span>
                            {q.createdAt ? <span>• {q.createdAt}</span> : null}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            setActionNotice(
                              `Simulated viewing Q&A question: "${q.title}"`
                            )
                          }
                        >
                          View Question
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center">
                    <MessageSquare className="size-8 text-muted-foreground/50" />
                    <p className="mt-2 text-xs font-medium text-foreground">
                      No questions asked yet for {previewCourse.code}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Have an academic question or need clarification on a topic?
                    </p>
                    <Link
                      href="/questions"
                      className="mt-3 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Ask Question
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
