import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import {
  type VoteTargetType,
  type VoteValue,
  type CurrentVote,
} from "@gibiverse/shared/types"
import {
  calculateVoteTransition,
  type VoteTransition,
} from "@gibiverse/shared/utils"
import { question, answer } from "../../db/schema/question.js"
import { vote } from "../../db/schema/vote.js"
import {
  ok,
  err,
  type Db,
  type StudentIdentity,
  type Result,
  type DomainError,
} from "../../lib/result.js"

export type { DomainError as VotingError }
export type VotingResult<T> = Result<T>

export type { VoteTargetType, VoteValue, CurrentVote, VoteTransition }
export { calculateVoteTransition }

export type CastVoteInput = {
  student: StudentIdentity
  targetType: VoteTargetType
  targetId: string
  value: VoteValue
}

export type VoteResult = {
  score: number
  studentVote: CurrentVote
  targetType: VoteTargetType
  targetId: string
}

const TARGET_CONFIG = {
  question: {
    table: question,
    notFoundMessage: "Question not found",
  },
  answer: {
    table: answer,
    notFoundMessage: "Answer not found",
  },
} as const

export function createVoting(deps: { db: Db }) {
  const { db } = deps

  async function cast(input: CastVoteInput): Promise<VotingResult<VoteResult>> {
    const { student, targetType, targetId, value } = input
    const config = TARGET_CONFIG[targetType]

    return await db.transaction(async (tx) => {
      // 1. Lock target row to serialize concurrent votes and verify existence
      const [existingTarget] = await tx
        .select({ id: config.table.id })
        .from(config.table)
        .where(eq(config.table.id, targetId))
        .for("update")

      if (!existingTarget) {
        return err("not_found", config.notFoundMessage)
      }

      // 2. Query existing vote for this student & target (with row lock)
      const [existingVote] = await tx
        .select({ id: vote.id, value: vote.value })
        .from(vote)
        .where(
          and(
            eq(vote.userId, student.id),
            eq(vote.targetType, targetType),
            eq(vote.targetId, targetId)
          )
        )
        .for("update")

      const currentVoteValue: CurrentVote = existingVote
        ? (existingVote.value as VoteValue)
        : null

      const { nextVote, scoreDelta } = calculateVoteTransition(
        currentVoteValue,
        value
      )

      if (existingVote) {
        if (nextVote === null) {
          // Toggle off
          await tx.delete(vote).where(eq(vote.id, existingVote.id))
        } else {
          // Switch direction
          await tx
            .update(vote)
            .set({ value: nextVote })
            .where(eq(vote.id, existingVote.id))
        }
      } else {
        // New vote
        await tx.insert(vote).values({
          id: randomUUID(),
          userId: student.id,
          targetType,
          targetId,
          value: nextVote!,
        })
      }

      // 3. Atomically update target score
      const [updated] = await tx
        .update(config.table)
        .set({ voteScore: sql`${config.table.voteScore} + ${scoreDelta}` })
        .where(eq(config.table.id, targetId))
        .returning({ voteScore: config.table.voteScore })

      return ok({
        score: updated?.voteScore ?? 0,
        studentVote: nextVote,
        targetType,
        targetId,
      })
    })
  }

  return {
    cast,
  }
}

export type Voting = ReturnType<typeof createVoting>
