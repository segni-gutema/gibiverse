"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@gibiverse/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gibiverse/ui/components/dialog"
import { Input } from "@gibiverse/ui/components/input"
import { Label } from "@gibiverse/ui/components/label"
import { Textarea } from "@gibiverse/ui/components/textarea"
import { CoursePicker } from "@/components/course-picker"
import { client } from "@gibiverse/api-client"
import { askQuestionSchema } from "@gibiverse/shared/types"
import type { Course, University } from "@/app/courses/presentation"

export type AskQuestionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  universities: University[]
  courses: Course[]
  initialCourseId?: string
  initialUniversityId?: string
}

export function AskQuestionDialog({
  open,
  onOpenChange,
  universities,
  courses,
  initialCourseId,
  initialUniversityId,
}: AskQuestionDialogProps) {
  const router = useRouter()
  const resolvedUnivId =
    initialUniversityId ??
    (initialCourseId
      ? (courses.find((c) => c.id === initialCourseId)?.universityId ?? null)
      : null)

  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [courseId, setCourseId] = React.useState<string | null>(
    initialCourseId ?? null
  )
  const [universityId, setUniversityId] = React.useState<string | null>(
    resolvedUnivId
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [prevOpen, setPrevOpen] = React.useState(open)
  const [prevInitialCourseId, setPrevInitialCourseId] =
    React.useState(initialCourseId)
  if (open !== prevOpen || initialCourseId !== prevInitialCourseId) {
    setPrevOpen(open)
    setPrevInitialCourseId(initialCourseId)
    if (open && initialCourseId) {
      setCourseId(initialCourseId)
      setUniversityId(resolvedUnivId)
    }
  }

  function resetForm() {
    setTitle("")
    setBody("")
    setCourseId(initialCourseId ?? null)
    setUniversityId(resolvedUnivId)
    setError(null)
    setIsSubmitting(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm()
    onOpenChange(next)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = askQuestionSchema.safeParse({
      courseId: courseId ?? "",
      title,
      body,
    })

    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ?? "Please check the form fields."
      )
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await client.api.questions.$post({
        json: validation.data,
      })
      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(errorData?.error || "Could not post question")
      }
      handleOpenChange(false)
      router.push("/questions")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post question")
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask a Question</DialogTitle>
          <DialogDescription>
            Tie your academic question to a course so peers can find and answer
            it.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <CoursePicker
            universities={universities}
            courses={courses}
            universityId={universityId}
            courseId={courseId}
            onUniversityChange={(next) => {
              setUniversityId(next)
              setCourseId(null)
            }}
            onCourseChange={setCourseId}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="question-title">Title</Label>
            <Input
              id="question-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. How do I approach recurrence relations?"
              maxLength={200}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="question-body">Question</Label>
            <Textarea
              id="question-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Describe what you are stuck on and what you have tried."
              rows={6}
              required
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Posting…" : "Post Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
