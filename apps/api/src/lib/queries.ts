import { and, eq, sql, type SQL, type AnyColumn } from "drizzle-orm"
import { vote } from "../db/schema/vote.js"

/**
 * Returns the Drizzle select expression for the authenticated student's current
 * vote on a target, plus the left-join condition to include in the query.
 *
 * Always exposed as `studentVote` — never `userVote` — in keeping with the
 * Gibiverse GLOSSARY definition of the actor as a Student.
 *
 * When no studentId is provided (unauthenticated), `studentVote` is a SQL
 * `null` literal and `joinOn` is `null` (no left join needed).
 *
 * The `studentVote` key is chosen to match the select-object key name, so
 * callers can spread the return value directly into their select object:
 *
 * @example
 * const { studentVote, joinOn } = studentVoteProjection(student?.id, "question", question.id)
 * const query = db
 *   .select({ ..., studentVote })
 *   .from(question)
 * const result = joinOn
 *   ? await query.leftJoin(vote, joinOn)
 *   : await query
 */
export function studentVoteProjection(
  studentId: string | null | undefined,
  targetType: "question" | "answer" | "courseMaterial",
  targetIdColumn: AnyColumn
): {
  studentVote: SQL<number | null>
  joinOn: SQL | null
} {
  if (!studentId) {
    return {
      studentVote: sql<number | null>`null`,
      joinOn: null,
    }
  }

  return {
    studentVote: sql<number | null>`${vote.value}`,
    joinOn: and(
      eq(vote.targetId, targetIdColumn),
      eq(vote.targetType, targetType),
      eq(vote.userId, studentId)
    ) as SQL,
  }
}
