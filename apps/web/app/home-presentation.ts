export type PlatformStats = {
  totalCourseMaterials: number
  totalResources?: number
  totalQuestions: number
  activeCourses: number
}

export const DEFAULT_PLATFORM_OVERVIEW = {
  stats: {
    totalCourseMaterials: 0,
    totalResources: 0,
    totalQuestions: 0,
    activeCourses: 0,
  },
  recentCourseMaterials: [],
  recentQuestions: [],
}

export function formatActivityCounter(count: number): string {
  return new Intl.NumberFormat("en-US").format(count)
}

export function getOverviewEmptyState(stats: PlatformStats): {
  hasActivity: boolean
  title: string
  description: string
} {
  const count = stats.totalCourseMaterials ?? stats.totalResources ?? 0
  const hasActivity =
    count > 0 || stats.totalQuestions > 0 || stats.activeCourses > 0

  if (!hasActivity) {
    return {
      hasActivity: false,
      title: "Welcome to the University Academic Hub",
      description:
        "Be the first to share a course material or ask an academic question to get the community started.",
    }
  }

  return {
    hasActivity: true,
    title: "Academic Course Material Sharing &amp; Course Q&amp;A",
    description:
      "Explore academic course materials, course questions, and peer answers across your university.",
  }
}

export function getRecentCourseMaterialsEmptyState(): {
  title: string
  description: string
} {
  return {
    title: "No course materials uploaded yet",
    description:
      "Share exam papers, notes, or slides with students from your courses.",
  }
}

export function getRecentQuestionsEmptyState(): {
  title: string
  description: string
} {
  return {
    title: "No questions asked yet",
    description:
      "Start the first academic question or discussion about your coursework.",
  }
}
