import type {
  VoteTargetType,
  VoteValue,
  CurrentVote,
} from "@gibiverse/shared/types"
import {
  calculateVoteTransition,
  type VoteTransition,
} from "@gibiverse/shared/utils"

export type { VoteTargetType, VoteValue, CurrentVote, VoteTransition }
export { calculateVoteTransition }

export interface VoteResponse {
  score: number
  studentVote: CurrentVote
  targetType: VoteTargetType
  targetId: string
}

/**
 * Generates the redirect URL to sign in, preserving the current page as callbackUrl.
 */
export function buildSignInRedirectUrl(currentPath: string): string {
  const encoded = encodeURIComponent(currentPath)
  return `/sign-in?callbackUrl=${encoded}`
}
