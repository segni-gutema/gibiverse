"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Check, CheckCircle2, MessageCircle } from "lucide-react"
import { Badge } from "@gibiverse/ui/components/badge"
import { Button } from "@gibiverse/ui/components/button"
import { AnswerComposer } from "./answer-composer"
import { MarkdownRenderer } from "./markdown-renderer"
import { VoteControls } from "./vote-controls"
import { client } from "@gibiverse/api-client"
import {
  canAcceptAnswer,
  formatDetailDate,
  isAnswerAccepted,
  type AnswerItem,
  type QuestionDetail,
} from "@/app/questions/presentation"
import { useSession } from "@/lib/auth-client"

interface QuestionDiscussionProps {
  initialQuestion: QuestionDetail
}

export function QuestionDiscussion({
  initialQuestion,
}: QuestionDiscussionProps) {
  const [question, setQuestion] =
    React.useState<QuestionDetail>(initialQuestion)
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null)
  const [acceptError, setAcceptError] = React.useState<string | null>(null)

  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  const isAuthor = canAcceptAnswer(question.studentId, currentUserId)

  async function handleToggleAccepted(answerId: string) {
    if (!isAuthor || acceptingId) return

    setAcceptingId(answerId)
    setAcceptError(null)

    // Toggle: if clicked answer is already accepted, unmark by sending null
    const targetPayloadId =
      question.acceptedAnswerId === answerId ? null : answerId

    try {
      const res = await client.api.questions[":id"].accept.$post({
        param: { id: question.id },
        json: { answerId: targetPayloadId },
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error || "Failed to update accepted answer.")
      }

      const updated = (await res.json()) as { acceptedAnswerId: string | null }

      setQuestion((prev) => ({
        ...prev,
        acceptedAnswerId: updated.acceptedAnswerId,
        answers: prev.answers.map((ans) => ({
          ...ans,
          isAccepted: isAnswerAccepted(updated.acceptedAnswerId, ans.id),
        })),
      }))
    } catch (err) {
      setAcceptError(
        err instanceof Error ? err.message : "Failed to update accepted status."
      )
    } finally {
      setAcceptingId(null)
    }
  }

  function handleAnswerSubmitted(newAnswer: AnswerItem) {
    setQuestion((prev) => ({
      ...prev,
      answerCount: prev.answerCount + 1,
      answers: [...prev.answers, { ...newAnswer, isAccepted: false }],
    }))
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-6"
        nativeButton={false}
        render={<Link href="/questions" />}
      >
        <ArrowLeft data-icon="inline-start" />
        Back to questions
      </Button>

      {/* Question Main Card */}
      <article
        className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-xs sm:flex-row sm:p-8"
        data-testid="question-main-article"
      >
        <div className="shrink-0 pt-0.5">
          <VoteControls
            targetType="question"
            targetId={question.id}
            initialScore={question.voteScore}
            initialStudentVote={question.studentVote}
            orientation="vertical"
            size="default"
            onVoteChange={(newScore, newStudentVote) => {
              setQuestion((prev) => ({
                ...prev,
                voteScore: newScore,
                studentVote: newStudentVote,
              }))
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{question.courseCode}</Badge>
            <span className="text-xs text-muted-foreground">
              {question.courseName}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {question.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 border-b pb-4 text-xs text-muted-foreground">
            <span>
              Asked by{" "}
              <strong className="text-foreground">
                {question.studentName}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={question.createdAt}>
              {formatDetailDate(question.createdAt)}
            </time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              <span>{question.answerCount} answers</span>
            </span>
          </div>

          {/* Full Question Body */}
          <div className="mt-6" data-testid="question-body">
            <MarkdownRenderer content={question.body} />
          </div>
        </div>
      </article>

      {/* Answers Section */}
      <section className="mt-10 space-y-6" aria-labelledby="answers-heading">
        <div className="flex items-center justify-between">
          <h2
            id="answers-heading"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            {question.answers.length}{" "}
            {question.answers.length === 1 ? "Answer" : "Answers"}
          </h2>
        </div>

        {acceptError ? (
          <p className="text-xs font-medium text-destructive" role="alert">
            {acceptError}
          </p>
        ) : null}

        {/* Answers List in Chronological Order */}
        {question.answers.length === 0 ? (
          <div
            className="rounded-lg border border-dashed p-8 text-center"
            data-testid="no-answers-prompt"
          >
            <p className="text-sm font-medium text-foreground">
              No answers submitted yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Be the first to share an answer and help out fellow students.
            </p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="answers-list">
            {question.answers.map((ans, idx) => {
              const isAccepted =
                isAnswerAccepted(question.acceptedAnswerId, ans.id) ||
                ans.isAccepted

              return (
                <article
                  key={ans.id}
                  id={`answer-${ans.id}`}
                  className={`flex gap-4 rounded-lg border p-5 transition-colors sm:p-6 ${
                    isAccepted
                      ? "border-emerald-500/60 bg-emerald-500/5 shadow-xs dark:bg-emerald-950/20"
                      : "bg-card"
                  }`}
                  data-testid={`answer-card-${ans.id}`}
                  data-accepted={isAccepted ? "true" : "false"}
                >
                  <div className="shrink-0 pt-0.5">
                    <VoteControls
                      targetType="answer"
                      targetId={ans.id}
                      initialScore={ans.voteScore}
                      initialStudentVote={ans.studentVote}
                      orientation="vertical"
                      size="sm"
                      onVoteChange={(newScore, newStudentVote) => {
                        setQuestion((prev) => ({
                          ...prev,
                          answers: prev.answers.map((a) =>
                            a.id === ans.id
                              ? {
                                  ...a,
                                  voteScore: newScore,
                                  studentVote: newStudentVote,
                                }
                              : a
                          ),
                        }))
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {ans.studentName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          answered {formatDetailDate(ans.createdAt)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          (#{idx + 1})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Distinctive Visual Accepted Badge */}
                        {isAccepted ? (
                          <Badge
                            className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600"
                            data-testid={`accepted-badge-${ans.id}`}
                          >
                            <Check className="size-3" aria-hidden="true" />
                            Accepted Answer
                          </Badge>
                        ) : null}

                        {/* Author Accepted Answer Toggle Button */}
                        {isAuthor ? (
                          <Button
                            type="button"
                            variant={isAccepted ? "secondary" : "outline"}
                            size="xs"
                            disabled={acceptingId === ans.id}
                            onClick={() => handleToggleAccepted(ans.id)}
                            data-testid={`accept-button-${ans.id}`}
                            aria-label={
                              isAccepted
                                ? "Unmark accepted answer"
                                : "Mark as accepted answer"
                            }
                          >
                            <CheckCircle2
                              className={`size-3.5 ${
                                isAccepted
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
                              }`}
                              data-icon="inline-start"
                            />
                            {isAccepted
                              ? "Unmark Accepted"
                              : "Mark as Accepted"}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {/* Answer Body */}
                    <div
                      className="mt-4 text-sm"
                      data-testid={`answer-body-${ans.id}`}
                    >
                      <MarkdownRenderer content={ans.body} />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Post an Answer Section */}
        <div className="mt-12 space-y-3 border-t pt-6">
          <h3 className="text-lg font-semibold text-foreground">Your Answer</h3>
          <AnswerComposer
            questionId={question.id}
            isAuthenticated={Boolean(session?.user)}
            onAnswerSubmitted={handleAnswerSubmitted}
          />
        </div>
      </section>
    </div>
  )
}
