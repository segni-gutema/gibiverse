"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  MessageSquare,
  MessageSquarePlus,
  Sparkles,
  Upload,
} from "lucide-react"
import { Badge } from "@gibiverse/ui/components/badge"
import { Button } from "@gibiverse/ui/components/button"
import { cn } from "@gibiverse/ui/lib/utils"
import { formatBytes } from "@gibiverse/shared/utils"
import { courseMaterialTypeOptions } from "@gibiverse/shared/types"
import { UploadCourseMaterialButton } from "@/components/upload-course-material-button"
import { AskQuestionButton } from "@/components/ask-question-button"
import {
  formatAcademicPeriod,
  formatRelativeUploadDate,
} from "@/app/course-materials/presentation"
import {
  filterCourseMaterialsByType,
  formatMaterialsCount,
  formatQuestionsCount,
  getCourseDetailsEmptyState,
  type Course,
  type CourseDetailsData,
  type University,
} from "../presentation"

export function CourseDetailsClient({
  course,
  universities,
  courses,
}: {
  course: CourseDetailsData
  universities: University[]
  courses: Course[]
}) {
  const [activeTab, setActiveTab] = React.useState<"materials" | "qa">(
    "materials"
  )
  const [selectedType, setSelectedType] = React.useState<string>("all")

  const materialsMeta = formatMaterialsCount(course.materialsCount)
  const questionsMeta = formatQuestionsCount(course.questionsCount)

  const filteredMaterials = React.useMemo(() => {
    return filterCourseMaterialsByType(course.materials, selectedType)
  }, [course.materials, selectedType])

  const materialsEmpty = getCourseDetailsEmptyState("materials", course.code)
  const qaEmpty = getCourseDetailsEmptyState("qa", course.code)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back navigation */}
      <div className="mb-6">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-courses-link"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Course Directory</span>
        </Link>
      </div>

      {/* Course Header Banner */}
      <header
        className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs"
        aria-label="Course Header"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {course.universityName}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                {course.departmentName}
              </Badge>
            </div>

            {/* Course Code & Name */}
            <div>
              <h1 className="font-mono text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
                {course.code}
              </h1>
              <p className="mt-1 text-lg font-medium text-muted-foreground">
                {course.name}
              </p>
            </div>

            {/* Activity Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span
                data-testid="header-materials-counter"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                  materialsMeta.isZero
                    ? "bg-muted text-muted-foreground"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                )}
              >
                <FileText className="size-3.5" />
                <span>{materialsMeta.label}</span>
              </span>

              <span
                data-testid="header-qa-counter"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                  questionsMeta.isZero
                    ? "bg-muted text-muted-foreground"
                    : "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400"
                )}
              >
                <MessageSquare className="size-3.5" />
                <span>{questionsMeta.label}</span>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 self-start">
            <UploadCourseMaterialButton
              universities={universities}
              courses={courses}
              initialCourseId={course.id}
              initialUniversityId={course.universityId}
            />
            <AskQuestionButton
              universities={universities}
              courses={courses}
              initialCourseId={course.id}
              initialUniversityId={course.universityId}
            />
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="mt-8">
        <div className="flex items-center border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              activeTab === "materials"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid="tab-materials"
          >
            <BookOpen className="size-4" />
            <span>Course Materials</span>
            <Badge
              variant={activeTab === "materials" ? "default" : "secondary"}
              className="ml-1 text-[11px] px-1.5 py-0"
            >
              {course.materials.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qa")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
              activeTab === "qa"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid="tab-qa"
          >
            <MessageSquare className="size-4" />
            <span>Academic Q&amp;A</span>
            <Badge
              variant={activeTab === "qa" ? "default" : "secondary"}
              className="ml-1 text-[11px] px-1.5 py-0"
            >
              {course.questions.length}
            </Badge>
          </button>
        </div>

        {/* TAB 1: COURSE MATERIALS */}
        {activeTab === "materials" ? (
          <div className="mt-6 flex flex-col gap-6">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedType("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-all border",
                  selectedType === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
                data-testid="type-filter-all"
              >
                All Types ({course.materials.length})
              </button>
              {courseMaterialTypeOptions.map((opt) => {
                const count = course.materials.filter(
                  (m) => m.courseMaterialType === opt.value
                ).length
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedType(opt.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-all border",
                      selectedType === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    )}
                    data-testid={`type-filter-${opt.value}`}
                  >
                    {opt.label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Materials List */}
            {filteredMaterials.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center"
                data-testid="materials-empty-state"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                  <Upload className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {materialsEmpty.title}
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {materialsEmpty.description}
                </p>
                <div className="mt-5">
                  <UploadCourseMaterialButton
                    universities={universities}
                    courses={courses}
                    initialCourseId={course.id}
                    initialUniversityId={course.universityId}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs"
                    data-testid={`material-item-${mat.id}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="text-[11px] capitalize">
                          {mat.courseMaterialType.replace("_", " ")}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatAcademicPeriod(mat.academicPeriod)}
                        </span>
                      </div>
                      <h3 className="mt-3 font-semibold text-foreground line-clamp-2">
                        {mat.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mat.fileName} • {formatBytes(mat.fileSize)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelativeUploadDate(
                          typeof mat.createdAt === "string"
                            ? mat.createdAt
                            : mat.createdAt.toISOString()
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/course-materials/${mat.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                          title="Preview Material"
                        >
                          <Eye className="size-3.5" />
                          <span>Preview</span>
                        </Link>
                        <a
                          href={`/api/course-materials/${mat.id}/download`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          title="Download file"
                          download
                        >
                          <Download className="size-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: ACADEMIC Q&A */
          <div className="mt-6 flex flex-col gap-6">
            {course.questions.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center"
                data-testid="qa-empty-state"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 mb-3">
                  <MessageSquarePlus className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {qaEmpty.title}
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {qaEmpty.description}
                </p>
                <div className="mt-5">
                  <AskQuestionButton
                    universities={universities}
                    courses={courses}
                    initialCourseId={course.id}
                    initialUniversityId={course.universityId}
                  />
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {course.questions.map((q) => (
                  <Link
                    key={q.id}
                    href={`/questions/${q.id}`}
                    className="flex flex-col gap-2 p-5 hover:bg-muted/40 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`question-item-${q.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground hover:text-primary transition-colors">
                          {q.title}
                        </h3>
                        {q.acceptedAnswerId ? (
                          <Badge
                            variant="default"
                            className="bg-emerald-600 text-white text-[11px] gap-1 px-1.5 py-0"
                          >
                            <CheckCircle2 className="size-3" />
                            <span>Solved</span>
                          </Badge>
                        ) : null}
                      </div>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {q.body}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                        <span className="text-muted-foreground">Score:</span>
                        <span>{q.voteScore}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                        <span className="text-muted-foreground">Answers:</span>
                        <span>{q.answerCount}</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
