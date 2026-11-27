import { randomUUID } from "node:crypto"
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm"
import type {
  QuestionSort,
  AskQuestionPayload,
  PostAnswerPayload,
  AcceptAnswerPayload,
} from "@gibiverse/shared/types"
import { course } from "../../db/schema/academic.js"
import { user as studentTable } from "../../db/schema/auth.js"
import { question, answer } from "../../db/schema/question.js"
import { vote } from "../../db/schema/vote.js"
import { studentVoteProjection } from "../../lib/queries.js"
import {
  ok,
  err,
  type Db,
  type StudentIdentity,
  type Result,
  type DomainError,
} from "../../lib/result.js"

export type { DomainError as QaError }
export type QaResult<T> = Result<T>

export type { QuestionSort }

export type AskQuestionInput = {
  student: StudentIdentity
} & AskQuestionPayload

export type PostAnswerInput = {
  student: StudentIdentity
  questionId: string
} & PostAnswerPayload

export type AcceptAnswerInput = {
  student: StudentIdentity
  questionId: string
} & AcceptAnswerPayload

export type ListFilters = {
  courseId?: string
  departmentId?: string
  sort: QuestionSort
}

export function createQa(deps: { db: Db }) {
  const { db } = deps

  async function ask(
    input: AskQuestionInput
  ): Promise<QaResult<typeof question.$inferSelect>> {
    const title = input.title?.trim()
    const body = input.body?.trim()
    const courseId = input.courseId?.trim()

    if (!title) {
      return err("validation", "Title is required")
    }
    if (!body) {
      return err("validation", "Body is required")
    }
    if (!courseId) {
      return err("validation", "Course is required")
    }

    const [existingCourse] = await db
      .select({ id: course.id })
      .from(course)
      .where(eq(course.id, courseId))
      .limit(1)

    if (!existingCourse) {
      return err("validation", "Course not found")
    }

    const id = randomUUID()
    const [created] = await db
      .insert(question)
      .values({
        id,
        title,
        body,
        courseId,
        userId: input.student.id,
      })
      .returning()

    if (!created) {
      return err("validation", "Failed to create question")
    }

    return ok(created)
  }

  async function list(input: {
    student: StudentIdentity | null
    filters: ListFilters
  }) {
    const { student, filters } = input
    const filterClauses: SQL[] = []
    if (filters.courseId) {
      filterClauses.push(eq(question.courseId, filters.courseId))
    }
    if (filters.departmentId) {
      filterClauses.push(eq(course.departmentId, filters.departmentId))
    }

    const orderBy =
      filters.sort === "most_voted"
        ? [desc(question.voteScore), desc(question.createdAt)]
        : filters.sort === "unanswered"
          ? [asc(question.answerCount), desc(question.createdAt)]
          : [desc(question.createdAt)]

    const { studentVote, joinOn } = studentVoteProjection(
      student?.id,
      "question",
      question.id
    )

    const base = db
      .select({
        id: question.id,
        title: question.title,
        body: question.body,
        createdAt: question.createdAt,
        courseId: question.courseId,
        courseCode: course.code,
        courseName: course.name,
        studentId: question.userId,
        studentName: studentTable.name,
        voteScore: question.voteScore,
        answerCount: question.answerCount,
        studentVote,
      })
      .from(question)
      .innerJoin(course, eq(question.courseId, course.id))
      .innerJoin(studentTable, eq(question.userId, studentTable.id))

    const withVote = joinOn ? base.leftJoin(vote, joinOn) : base
    const filtered =
      filterClauses.length > 0
        ? withVote.where(and(...filterClauses))
        : withVote

    const rows = await filtered.orderBy(...orderBy)

    return ok(rows)
  }

  async function get(input: {
    student: StudentIdentity | null
    questionId: string
  }) {
    const { student, questionId } = input

    const { studentVote: qStudentVote, joinOn: qJoinOn } =
      studentVoteProjection(student?.id, "question", question.id)

    const qBase = db
      .select({
        id: question.id,
        title: question.title,
        body: question.body,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        courseId: question.courseId,
        courseCode: course.code,
        courseName: course.name,
        studentId: question.userId,
        studentName: studentTable.name,
        voteScore: question.voteScore,
        answerCount: question.answerCount,
        acceptedAnswerId: question.acceptedAnswerId,
        studentVote: qStudentVote,
      })
      .from(question)
      .innerJoin(course, eq(question.courseId, course.id))
      .innerJoin(studentTable, eq(question.userId, studentTable.id))

    const [qRow] = await (qJoinOn ? qBase.leftJoin(vote, qJoinOn) : qBase)
      .where(eq(question.id, questionId))
      .limit(1)

    if (!qRow) {
      return err("not_found", "Question not found")
    }

    const { studentVote: aStudentVote, joinOn: aJoinOn } =
      studentVoteProjection(student?.id, "answer", answer.id)

    const aBase = db
      .select({
        id: answer.id,
        body: answer.body,
        questionId: answer.questionId,
        studentId: answer.userId,
        studentName: studentTable.name,
        voteScore: answer.voteScore,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
        studentVote: aStudentVote,
      })
      .from(answer)
      .innerJoin(studentTable, eq(answer.userId, studentTable.id))

    const answers = await (aJoinOn ? aBase.leftJoin(vote, aJoinOn) : aBase)
      .where(eq(answer.questionId, questionId))
      .orderBy(asc(answer.createdAt))
    const answersWithAccepted = answers.map((ans) => ({
      ...ans,
      isAccepted: qRow.acceptedAnswerId === ans.id,
    }))

    return ok({
      ...qRow,
      answers: answersWithAccepted,
    })
  }

  async function postAnswer(input: PostAnswerInput) {
    const [existingQuestion] = await db
      .select({ id: question.id })
      .from(question)
      .where(eq(question.id, input.questionId))
      .limit(1)

    if (!existingQuestion) {
      return err("not_found", "Question not found")
    }

    const body = input.body?.trim()
    if (!body) {
      return err("validation", "Answer body is required")
    }

    const id = randomUUID()
    const [createdAnswer] = await db
      .insert(answer)
      .values({
        id,
        body,
        questionId: input.questionId,
        userId: input.student.id,
      })
      .returning()

    if (!createdAnswer) {
      return err("validation", "Failed to create answer")
    }

    await db
      .update(question)
      .set({ answerCount: sql`${question.answerCount} + 1` })
      .where(eq(question.id, input.questionId))

    return ok({
      ...createdAnswer,
      studentId: input.student.id,
      studentName: input.student.name,
      isAccepted: false,
    })
  }

  async function accept(input: AcceptAnswerInput) {
    const [existingQuestion] = await db
      .select({
        id: question.id,
        userId: question.userId,
        acceptedAnswerId: question.acceptedAnswerId,
      })
      .from(question)
      .where(eq(question.id, input.questionId))
      .limit(1)

    if (!existingQuestion) {
      return err("not_found", "Question not found")
    }

    if (existingQuestion.userId !== input.student.id) {
      return err("forbidden", "Only the question author can accept an answer")
    }

    const targetAnswerId =
      typeof input.answerId === "string" && input.answerId.trim().length > 0
        ? input.answerId.trim()
        : null

    let nextAcceptedId: string | null = null
    if (targetAnswerId) {
      if (existingQuestion.acceptedAnswerId === targetAnswerId) {
        nextAcceptedId = null
      } else {
        const [targetAnswer] = await db
          .select({ id: answer.id, questionId: answer.questionId })
          .from(answer)
          .where(eq(answer.id, targetAnswerId))
          .limit(1)

        if (!targetAnswer || targetAnswer.questionId !== input.questionId) {
          return err("validation", "Answer does not belong to this question")
        }
        nextAcceptedId = targetAnswerId
      }
    }

    const [updated] = await db
      .update(question)
      .set({ acceptedAnswerId: nextAcceptedId })
      .where(eq(question.id, input.questionId))
      .returning({
        id: question.id,
        acceptedAnswerId: question.acceptedAnswerId,
      })

    if (!updated) {
      return err("not_found", "Question not found")
    }

    return ok(updated)
  }

  return {
    list,
    get,
    ask,
    answer: postAnswer,
    accept,
  }
}

export type Qa = ReturnType<typeof createQa>
