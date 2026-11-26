"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MessageSquarePlus } from "lucide-react"
import { Button } from "@gibiverse/ui/components/button"
import { AskQuestionDialog } from "@/components/ask-question-dialog"
import type { Course, University } from "@/app/courses/presentation"
import {
  ASK_QUESTION_PATH,
  getAskSignInHref,
} from "@/app/questions/presentation"
import { useSession } from "@/lib/auth-client"

export type AskQuestionButtonProps = {
  universities: University[]
  courses: Course[]
  /** When true, open the dialog immediately (authenticated deep link). */
  autoOpen?: boolean
  initialCourseId?: string
  initialUniversityId?: string
}

export function AskQuestionButton({
  universities,
  courses,
  autoOpen = false,
  initialCourseId,
  initialUniversityId,
}: AskQuestionButtonProps) {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [userOpen, setUserOpen] = React.useState<boolean | null>(null)
  const open = userOpen ?? (autoOpen && !isPending && Boolean(session?.user))

  React.useEffect(() => {
    if (autoOpen && !isPending && !session?.user) {
      router.replace(getAskSignInHref(ASK_QUESTION_PATH))
    }
  }, [autoOpen, isPending, router, session?.user])

  function handleClick() {
    if (isPending) return
    if (!session?.user) {
      router.push(getAskSignInHref(ASK_QUESTION_PATH))
      return
    }
    setUserOpen(true)
  }

  return (
    <>
      <Button type="button" onClick={handleClick} disabled={isPending}>
        <MessageSquarePlus data-icon="inline-start" />
        Ask a Question
      </Button>
      <AskQuestionDialog
        open={open}
        onOpenChange={setUserOpen}
        universities={universities}
        courses={courses}
        initialCourseId={initialCourseId}
        initialUniversityId={initialUniversityId}
      />
    </>
  )
}
