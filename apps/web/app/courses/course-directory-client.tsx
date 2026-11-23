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
  }, [normalizedCourses, selectedUniversityId, selectedDepartmentId, searchQuery, sortBy])

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

  return (
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
                  {universities.map((uni) => (
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
                {universities.find((u) => u.id === selectedUniversityId)
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
