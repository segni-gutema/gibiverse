"use client"

import * as React from "react"
import Link from "next/link"
import { Bold, Code, Eye, Italic, List, Send, Terminal } from "lucide-react"
import { Button } from "@gibiverse/ui/components/button"
import { Textarea } from "@gibiverse/ui/components/textarea"
import { MarkdownRenderer } from "./markdown-renderer"
import { client } from "@gibiverse/api-client"
import { postAnswerSchema } from "@gibiverse/shared/types"

interface AnswerComposerProps {
  questionId: string
  isAuthenticated: boolean
  onAnswerSubmitted: (answer: {
    id: string
    body: string
    questionId: string
    studentId: string
    studentName: string
    voteScore: number
    isAccepted: boolean
    createdAt: string
    updatedAt: string
  }) => void
}

export function AnswerComposer({
  questionId,
  isAuthenticated,
  onAnswerSubmitted,
}: AnswerComposerProps) {
  const [body, setBody] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  function insertFormatting(prefix: string, suffix = "") {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = body.slice(start, end)
    const replacement = `${prefix}${selected || "text"}${suffix}`

    const nextValue = body.slice(0, start) + replacement + body.slice(end)
    setBody(nextValue)

    // Focus and highlight the inserted text
    requestAnimationFrame(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length
      textarea.setSelectionRange(
        newCursorPos,
        newCursorPos + (selected ? selected.length : 4)
      )
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validation = postAnswerSchema.safeParse({ body })
    if (!validation.success) {
      setError(
        validation.error.issues[0]?.message ?? "Please enter your answer."
      )
      return
    }

    setIsSubmitting(true)
    try {
      const res = await client.api.questions[":id"].answers.$post({
        param: { id: questionId },
        json: validation.data,
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error || "Failed to post answer.")
      }

      const created = await res.json()
      setBody("")
      setActiveTab("write")
      onAnswerSubmitted(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post answer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-lg border border-dashed p-6 text-center"
        data-testid="answer-unauthenticated-prompt"
      >
        <p className="text-sm text-muted-foreground">
          You must be signed in to post an answer.
        </p>
        <Button
          size="sm"
          className="mt-3"
          nativeButton={false}
          render={
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(
                typeof window !== "undefined"
                  ? window.location.pathname
                  : `/questions/${questionId}`
              )}`}
            />
          }
        >
          Sign in to answer
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-card p-4 sm:p-6"
      data-testid="answer-composer-form"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={activeTab === "write" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("write")}
            data-testid="tab-write"
          >
            Write
          </Button>
          <Button
            type="button"
            variant={activeTab === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("preview")}
            data-testid="tab-preview"
          >
            <Eye className="size-3.5" data-icon="inline-start" />
            Preview
          </Button>
        </div>

        {activeTab === "write" ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Bold"
              aria-label="Format bold"
              onClick={() => insertFormatting("**", "**")}
            >
              <Bold className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Italic"
              aria-label="Format italic"
              onClick={() => insertFormatting("*", "*")}
            >
              <Italic className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Inline Code"
              aria-label="Format inline code"
              onClick={() => insertFormatting("`", "`")}
            >
              <Code className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Code Block"
              aria-label="Format code block"
              onClick={() => insertFormatting("```\n", "\n```")}
            >
              <Terminal className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="List"
              aria-label="Format bullet list"
              onClick={() => insertFormatting("- ")}
            >
              <List className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {activeTab === "write" ? (
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your answer using markdown..."
          rows={6}
          className="font-mono text-sm"
          data-testid="answer-body-input"
        />
      ) : (
        <div
          className="min-h-[144px] rounded-md border bg-muted/20 p-4"
          data-testid="answer-preview-pane"
        >
          {body.trim() ? (
            <MarkdownRenderer content={body} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nothing to preview yet.
            </p>
          )}
        </div>
      )}

      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || !body.trim()}
          data-testid="submit-answer-button"
        >
          <Send className="size-3.5" data-icon="inline-start" />
          {isSubmitting ? "Posting..." : "Post Answer"}
        </Button>
      </div>
    </form>
  )
}
