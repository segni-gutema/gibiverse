"use client"

import * as React from "react"
import Link from "next/link"
import {
  Search,
  X,
  FileText,
  MessageSquare,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
  GraduationCap,
  BookOpen,
  ArrowUpDown,
} from "lucide-react"
import { cn } from "@gibiverse/ui/lib/utils"
import { Button } from "@gibiverse/ui/components/button"
import { Badge } from "@gibiverse/ui/components/badge"
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
  filterCourses,
  getAvailableDepartments,
  isDepartmentCompatibleWithUniversity,
  formatMaterialsCount,
  formatQuestionsCount,
  type Course,
  type CourseSummary,
  type Department,
  type University,
  type CourseCardData,
  type CourseSortOption,
} from "./presentation"

const ALL_OPTION = "all"

export function CourseDirectoryClient({
  universities = [],
  departments = [],
  courses = [],
}: {
  universities?: University[]
  departments: Department[]
  courses: (CourseSummary | Course)[]
}) {
  // Cascading filters & search state
  const [selectedUniversityId, setSelectedUniversityId] =
    React.useState<string>(ALL_OPTION)
  const [selectedDepartmentId, setSelectedDepartmentId] =
    React.useState<string>(ALL_OPTION)
  const [searchQuery, setSearchQuery] = React.useState<string>("")
  const [sortBy, setSortBy] = React.useState<CourseSortOption>("code-asc")

  // Normalize live courses
  const normalizedCourses: CourseCardData[] = React.useMemo(() => {
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

  const availableDepartments = React.useMemo(() => {
    return getAvailableDepartments(departments, selectedUniversityId)
  }, [departments, selectedUniversityId])

  // Handle university change with cascading auto-reset
  const handleUniversityChange = (newUnivId: string) => {
    setSelectedUniversityId(newUnivId)
    if (
      selectedDepartmentId !== ALL_OPTION &&
      !isDepartmentCompatibleWithUniversity(
        departments,
        selectedDepartmentId,
        newUnivId
      )
    ) {
      setSelectedDepartmentId(ALL_OPTION)
    }
  }

  // Filtered & sorted courses
  const filteredCourses = React.useMemo(() => {
    return filterCourses(normalizedCourses, {
      universityId: selectedUniversityId,
      departmentId: selectedDepartmentId,
      searchQuery,
      sortBy,
    })
  }, [
    normalizedCourses,
    selectedUniversityId,
    selectedDepartmentId,
    searchQuery,
    sortBy,
  ])

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

  const selectedUniversityName =
    selectedUniversityId !== ALL_OPTION
      ? (universities.find((u) => u.id === selectedUniversityId)?.name ?? null)
      : null

  const selectedDepartmentName =
    selectedDepartmentId !== ALL_OPTION
      ? (departments.find((d) => d.id === selectedDepartmentId)?.name ?? null)
      : null

  return (
    <div className="flex flex-col gap-6">
      {/* Filters & Search Toolbar with Explicit Labels */}
      <section
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"
        aria-label="Course Filters"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search Input with Clear Label */}
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-4">
            <label
              htmlFor="course-search-input"
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80"
            >
              <Search className="size-3.5 text-primary" />
              <span>Search Course</span>
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="course-search-input"
                type="text"
                placeholder="Search by code (e.g. CS101) or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8 pl-9"
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
          </div>

          {/* University Picker with Clear Label */}
          <div className="flex flex-col gap-1.5 sm:col-span-1 lg:col-span-3">
            <label
              htmlFor="university-select"
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80"
            >
              <GraduationCap className="size-3.5 text-primary" />
              <span>University</span>
            </label>
            <Select
              value={selectedUniversityId}
              onValueChange={(val) => handleUniversityChange(val ?? ALL_OPTION)}
            >
              <SelectTrigger
                id="university-select"
                className="w-full"
                data-testid="university-select"
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

          {/* Cascading Department Picker with Clear Label */}
          <div className="flex flex-col gap-1.5 sm:col-span-1 lg:col-span-3">
            <label
              htmlFor="department-select"
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80"
            >
              <BookOpen className="size-3.5 text-primary" />
              <span>Department</span>
              {selectedUniversityName ? (
                <span className="text-[10px] font-normal text-muted-foreground">
                  (filtered)
                </span>
              ) : null}
            </label>
            <Select
              value={selectedDepartmentId}
              onValueChange={(val) =>
                setSelectedDepartmentId(val ?? ALL_OPTION)
              }
            >
              <SelectTrigger
                id="department-select"
                className="w-full"
                data-testid="department-select"
              >
                <div className="flex items-center gap-2 truncate">
                  <BookOpen className="size-3.5 shrink-0 text-muted-foreground/70" />
                  <SelectValue placeholder="All Departments" />
                </div>
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

          {/* Sort By Dropdown with Clear Label */}
          <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="sort-select"
                className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80"
              >
                <ArrowUpDown className="size-3.5 text-primary" />
                <span>Sort By</span>
              </label>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  data-testid="reset-filters-button"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset</span>
                </button>
              ) : null}
            </div>
            <Select
              value={sortBy}
              onValueChange={(val) =>
                setSortBy((val as CourseSortOption) ?? "code-asc")
              }
            >
              <SelectTrigger
                id="sort-select"
                className="w-full"
                data-testid="sort-select"
              >
                <div className="flex items-center gap-2 truncate">
                  <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground/70" />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="code-asc">Code (A–Z)</SelectItem>
                  <SelectItem value="materials-desc">Most Materials</SelectItem>
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
                {filteredCourses.length}
              </strong>{" "}
              {filteredCourses.length === 1 ? "course" : "courses"}
            </span>

            {/* Active Filter Tags */}
            {selectedUniversityName ? (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-[11px] font-normal"
              >
                <GraduationCap className="size-3 text-primary" />
                <span>Uni: {selectedUniversityName}</span>
                <button
                  type="button"
                  onClick={() => handleUniversityChange(ALL_OPTION)}
                  className="ml-0.5 rounded hover:text-foreground"
                  aria-label="Remove university filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ) : null}

            {selectedDepartmentName ? (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-[11px] font-normal"
              >
                <BookOpen className="size-3 text-primary" />
                <span>Dept: {selectedDepartmentName}</span>
                <button
                  type="button"
                  onClick={() => setSelectedDepartmentId(ALL_OPTION)}
                  className="ml-0.5 rounded hover:text-foreground"
                  aria-label="Remove department filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ) : null}

            {searchQuery.trim() ? (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-[11px] font-normal"
              >
                <Search className="size-3 text-primary" />
                <span>Search: &ldquo;{searchQuery.trim()}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="ml-0.5 rounded hover:text-foreground"
                  aria-label="Remove search filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ) : null}
          </div>

          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1 size-3" />
              Clear all
            </Button>
          ) : null}
        </div>
      </section>

      {/* 3-Column Responsive Course Card Grid */}
      {filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <SlidersHorizontal className="mb-3 size-10 text-muted-foreground/60" />
          <h3 className="text-base font-semibold text-foreground">
            {normalizedCourses.length === 0
              ? "No courses available"
              : "No courses found"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {normalizedCourses.length === 0
              ? "No courses have been seeded or created yet."
              : "No courses match the active filters. Try resetting the filters or choosing another university or department."}
          </p>
          {hasActiveFilters ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="mt-4"
            >
              Clear all filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => {
            const materialsMeta = formatMaterialsCount(course.materialsCount)
            const questionsMeta = formatQuestionsCount(course.questionsCount)

            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                data-testid={`course-card-${course.code}`}
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
      )}
    </div>
  )
}
