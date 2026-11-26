"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { Button } from "@gibiverse/ui/components/button"
import { UploadCourseMaterialWizard } from "@/components/upload-course-material-wizard"
import type { Course, University } from "@/app/courses/presentation"
import { useSession } from "@/lib/auth-client"
import {
  getUploadSignInHref,
  UPLOAD_COURSE_MATERIAL_PATH,
} from "@/app/course-materials/presentation"

export type UploadCourseMaterialButtonProps = {
  universities: University[]
  courses: Course[]
  /** When true, open the wizard immediately (authenticated deep link). */
  autoOpen?: boolean
  initialCourseId?: string
  initialUniversityId?: string
}

export function UploadCourseMaterialButton({
  universities,
  courses,
  autoOpen = false,
  initialCourseId,
  initialUniversityId,
}: UploadCourseMaterialButtonProps) {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [userOpen, setUserOpen] = React.useState<boolean | null>(null)
  const open = userOpen ?? (autoOpen && !isPending && Boolean(session?.user))

  React.useEffect(() => {
    if (autoOpen && !isPending && !session?.user) {
      router.replace(getUploadSignInHref(UPLOAD_COURSE_MATERIAL_PATH))
    }
  }, [autoOpen, isPending, router, session?.user])

  function handleClick() {
    if (isPending) return
    if (!session?.user) {
      router.push(getUploadSignInHref(UPLOAD_COURSE_MATERIAL_PATH))
      return
    }
    setUserOpen(true)
  }

  return (
    <>
      <Button type="button" onClick={handleClick} disabled={isPending}>
        <Upload data-icon="inline-start" />
        Upload Course Material
      </Button>
      <UploadCourseMaterialWizard
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

// Backwards compatibility alias
export const UploadResourceButton = UploadCourseMaterialButton
export type UploadResourceButtonProps = UploadCourseMaterialButtonProps
