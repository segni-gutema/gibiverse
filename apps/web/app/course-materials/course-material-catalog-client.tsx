"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, File, FileText, Presentation } from "lucide-react"
import { cn } from "@gibiverse/ui/lib/utils"
import { Badge } from "@gibiverse/ui/components/badge"
import { Button } from "@gibiverse/ui/components/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@gibiverse/ui/components/toggle-group"
import { client } from "@gibiverse/api-client"
import type { Course, University } from "@/app/courses/presentation"
import { formatRelativeUploadDate } from "@/lib/formatters"
import { ACTIVE_TOGGLE_CLASSES } from "@/lib/toggle-styles"
import { CourseFilterDropdown } from "@/components/course-filter-dropdown"
import {
  catalogEmptyState,
  hasActiveCatalogFilters,
  type CourseMaterialFilters,
  type CatalogCourseMaterial,
} from "./presentation"
import {
  courseMaterialTypeOptions,
  courseMaterialTypePillLabels,
  type CourseMaterialType,
} from "@gibiverse/shared/types"

const ALL_TYPE_KEY = "__all_types__"

function FileTypeIcon({
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

export function CourseMaterialCatalogClient({
  universities,
  courses,
  initialCourseMaterials,
  universityName = null,
}: {
  universities: University[]
  courses: Course[]
  initialCourseMaterials: CatalogCourseMaterial[]
  universityName?: string | null
}) {
  const [filters, setFilters] = React.useState<CourseMaterialFilters>({
    courseMaterialType: null,
    universityId: null,
    courseId: null,
  })
  const [courseMaterials, setCourseMaterials] = React.useState<
    CatalogCourseMaterial[]
  >(initialCourseMaterials)
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

    client.api["course-materials"]
      .$get({
        query: {
          courseMaterialType: filters.courseMaterialType || undefined,
          universityId: filters.universityId || undefined,
          departmentId: filters.departmentId || undefined,
          courseId: filters.courseId || undefined,
        },
      })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load course materials")
        return res.json()
      })
      .then((next) => {
        if (!cancelled)
          setCourseMaterials(next as unknown as CatalogCourseMaterial[])
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load course materials. Please try again.")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  const emptyState = catalogEmptyState(filters)

  return (
    <div className="flex flex-col gap-8">
      <CatalogFiltersBar
        universities={universities}
        courses={courses}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <section
        className="flex flex-col gap-4"
        aria-label="Course Materials"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Updating…</p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {courseMaterials.length === 0 ? (
          <div
            className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-6 py-10"
            data-testid="course-materials-empty-state"
          >
            <h3 className="text-base font-semibold text-foreground">
              {emptyState.title}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              {emptyState.description}
            </p>
            {hasActiveCatalogFilters(filters) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({
                    courseMaterialType: null,
                    universityId: null,
                    courseId: null,
                  })
                }
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <ul
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="course-materials-grid"
          >
            {courseMaterials.map((material) => (
              <li key={material.id}>
                <Link
                  href={`/course-materials/${material.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-all hover:border-foreground/20 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  data-testid={`course-material-card-${material.id}`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted/50">
                    {material.thumbnailPath ? (
                      <Image
                        src={`/api/course-materials/${material.id}/thumbnail`}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <FileTypeIcon
                          courseMaterialType={
                            material.courseMaterialType ?? "other"
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Content: Title, University + Course Code, Type (left) + Date (right) */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {/* Title */}
                    <h3 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                      {material.title}
                    </h3>

                    {/* University name + Course code on the same line */}
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      {universityName ? (
                        <>
                          <span className="truncate font-medium text-foreground/80">
                            {universityName}
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
                        {material.courseCode}
                      </Badge>
                    </div>

                    {/* Type on left + Upload date on right */}
                    <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {courseMaterialTypePillLabels[
                          material.courseMaterialType as CourseMaterialType
                        ] ?? material.courseMaterialType}
                      </Badge>
                      <time dateTime={material.createdAt}>
                        {formatRelativeUploadDate(material.createdAt)}
                      </time>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Filter bar: course-material-type tabs + course dropdown           */
/* ------------------------------------------------------------------ */

function CatalogFiltersBar({
  universities,
  courses,
  filters,
  onFiltersChange,
}: {
  universities: University[]
  courses: Course[]
  filters: CourseMaterialFilters
  onFiltersChange: (filters: CourseMaterialFilters) => void
}) {
  const activeType = filters.courseMaterialType
  const typeValue = activeType ? [activeType] : [ALL_TYPE_KEY]

  return (
    <div
      className="flex flex-col gap-3"
      role="search"
      aria-label="Filter course materials"
    >
      {/* Course Material Type tabs with "All" */}
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={2}
        value={typeValue}
        onValueChange={(next) => {
          const selected = next[0]
          if (!selected || selected === ALL_TYPE_KEY) {
            onFiltersChange({
              ...filters,
              courseMaterialType: null,
            })
          } else {
            const match = courseMaterialTypeOptions.find(
              (option) => option.value === selected
            )
            onFiltersChange({
              ...filters,
              courseMaterialType: match?.value ?? null,
            })
          }
        }}
        className="flex flex-wrap"
        aria-label="Filter by course material type"
      >
        <ToggleGroupItem
          value={ALL_TYPE_KEY}
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

      {/* Shared Filter by course dropdown */}
      <CourseFilterDropdown
        universities={universities}
        courses={courses}
        selectedUniversityId={filters.universityId}
        selectedCourseId={filters.courseId}
        onFilterChange={({ universityId, courseId }) =>
          onFiltersChange({
            ...filters,
            universityId,
            courseId,
          })
        }
      />
    </div>
  )
}
