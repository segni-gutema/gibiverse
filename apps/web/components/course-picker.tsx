"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gibiverse/ui/components/select"
import { Label } from "@gibiverse/ui/components/label"
import {
  filterCoursesByUniversity,
  type Course,
  type University,
} from "@/app/courses/presentation"

const ALL_VALUE = "__all__"

export type CoursePickerProps = {
  universities: University[]
  courses: Course[]
  universityId?: string | null
  courseId?: string | null
  onUniversityChange?: (universityId: string | null) => void
  onCourseChange?: (courseId: string | null) => void
  disabled?: boolean
  /** When true, include All options so filters can be cleared. */
  allowClear?: boolean
}

export function CoursePicker({
  universities,
  courses,
  universityId: controlledUniversityId,
  courseId: controlledCourseId,
  onUniversityChange,
  onCourseChange,
  disabled = false,
  allowClear = false,
}: CoursePickerProps) {
  const [universityId, setUniversityId] = React.useState<string | null>(
    controlledUniversityId ?? null
  )
  const [courseId, setCourseId] = React.useState<string | null>(
    controlledCourseId ?? null
  )

  React.useEffect(() => {
    if (controlledUniversityId !== undefined) {
      setUniversityId(controlledUniversityId)
    }
  }, [controlledUniversityId])

  React.useEffect(() => {
    if (controlledCourseId !== undefined) {
      setCourseId(controlledCourseId)
    }
  }, [controlledCourseId])

  const filteredCourses = filterCoursesByUniversity(courses, universityId)

  const handleUniversityChange = (value: string | null) => {
    const next = !value || value === ALL_VALUE ? null : value
    setUniversityId(next)
    setCourseId(null)
    onUniversityChange?.(next)
    onCourseChange?.(null)
  }

  const handleCourseChange = (value: string | null) => {
    const next = !value || value === ALL_VALUE ? null : value
    setCourseId(next)
    onCourseChange?.(next)
  }

  return (
    <div
      className="flex flex-col gap-4 sm:flex-row"
      data-testid="course-picker"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label htmlFor="university-picker">University</Label>
        <Select
          value={universityId ?? null}
          onValueChange={handleUniversityChange}
          disabled={disabled}
        >
          <SelectTrigger
            id="university-picker"
            className="w-full"
            data-testid="university-picker-trigger"
          >
            <SelectValue placeholder="Select a university" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {allowClear ? (
                <SelectItem value={ALL_VALUE}>Select a university</SelectItem>
              ) : null}
              {universities.map((uni) => (
                <SelectItem key={uni.id} value={uni.id}>
                  {uni.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label htmlFor="course-picker">Course</Label>
        <Select
          value={courseId ?? null}
          onValueChange={handleCourseChange}
          disabled={disabled || !universityId}
        >
          <SelectTrigger
            id="course-picker"
            className="w-full"
            data-testid="course-picker-trigger"
          >
            <SelectValue
              placeholder={
                universityId ? "Select a course" : "Choose a university first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {allowClear && universityId ? (
                <SelectItem value={ALL_VALUE}>Select a course</SelectItem>
              ) : null}
              {filteredCourses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
