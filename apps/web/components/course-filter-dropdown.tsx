"use client"

import * as React from "react"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@gibiverse/ui/lib/utils"
import { Button } from "@gibiverse/ui/components/button"
import { Label } from "@gibiverse/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gibiverse/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gibiverse/ui/components/select"
import type { Course, University } from "@/app/courses/presentation"
import { filterCoursesByUniversity } from "@/app/courses/presentation"

const ALL_OPTION = "__all_option__"

export interface CourseFilterDropdownProps {
  universities: University[]
  courses: Course[]
  selectedUniversityId?: string | null
  selectedCourseId?: string | null
  onFilterChange: (filters: {
    universityId: string | null
    courseId: string | null
  }) => void
  className?: string
}

export function CourseFilterDropdown({
  universities,
  courses,
  selectedUniversityId = null,
  selectedCourseId = null,
  onFilterChange,
  className,
}: CourseFilterDropdownProps) {
  const filteredCourses = filterCoursesByUniversity(
    courses,
    selectedUniversityId
  )

  const hasCourseFilter = Boolean(selectedUniversityId || selectedCourseId)
  const courseButtonParts: string[] = []
  if (selectedUniversityId) {
    const uni = universities.find((u) => u.id === selectedUniversityId)
    if (uni) courseButtonParts.push(uni.name)
  }
  if (selectedCourseId) {
    const course = courses.find((c) => c.id === selectedCourseId)
    if (course) courseButtonParts.push(course.code)
  }
  const courseButtonLabel =
    courseButtonParts.length > 0
      ? courseButtonParts.join(" · ")
      : "Filter by course"

  const handleUniversityChange = (value: string | null) => {
    const nextUniId = !value || value === ALL_OPTION ? null : value
    onFilterChange({
      universityId: nextUniId,
      courseId: null,
    })
  }

  const handleCourseChange = (value: string | null) => {
    const nextCourseId = !value || value === ALL_OPTION ? null : value
    onFilterChange({
      universityId: selectedUniversityId,
      courseId: nextCourseId,
    })
  }

  const handleClear = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    onFilterChange({
      universityId: null,
      courseId: null,
    })
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "gap-1.5",
                hasCourseFilter &&
                  "border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
              )}
              data-testid="filter-by-course-button"
            />
          }
        >
          {courseButtonLabel}
          {hasCourseFilter ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleClear(e)
                }
              }}
              className="ml-0.5 flex size-4 items-center justify-center rounded-full hover:bg-muted-foreground/20"
              aria-label="Clear course filter"
            >
              <X className="size-3" />
            </span>
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-72 p-3"
          data-testid="course-filter-dropdown-popover"
        >
          <div className="flex flex-col gap-3">
            {/* University select */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                University
              </Label>
              <Select
                value={selectedUniversityId ?? null}
                onValueChange={handleUniversityChange}
              >
                <SelectTrigger
                  className="h-9 text-sm"
                  data-testid="filter-university-trigger"
                >
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL_OPTION}>
                      Select university
                    </SelectItem>
                    {universities.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Course select */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Course</Label>
              <Select
                value={selectedCourseId ?? null}
                onValueChange={handleCourseChange}
                disabled={!selectedUniversityId}
              >
                <SelectTrigger
                  className="h-9 text-sm"
                  data-testid="filter-course-trigger"
                >
                  <SelectValue
                    placeholder={
                      selectedUniversityId
                        ? "Select course"
                        : "Select university first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {selectedUniversityId ? (
                      <SelectItem value={ALL_OPTION}>Select course</SelectItem>
                    ) : null}
                    {filteredCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
