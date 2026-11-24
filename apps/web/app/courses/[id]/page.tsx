import { notFound } from "next/navigation"
import { client } from "@gibiverse/api-client"
import { CourseDetailsClient } from "./course-details-client"
import type { Course, CourseDetailsData, University } from "../presentation"

export const dynamic = "force-dynamic"

export default async function CourseDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let course: CourseDetailsData | null = null
  let universities: University[] = []
  let courses: Course[] = []

  try {
    const courseRes = await (
      client.api.courses as unknown as {
        ":id": {
          $get: (args: { param: { id: string } }) => Promise<Response>
        }
      }
    )[":id"].$get({ param: { id } })

    if (!courseRes.ok) {
      notFound()
    }

    course = (await courseRes.json()) as CourseDetailsData

    const [univRes, scopedCoursesRes] = await Promise.all([
      client.api.universities.$get(),
      (
        client.api.courses.$get as (args?: {
          query?: { universityId?: string; departmentId?: string }
        }) => Promise<Response>
      )({
        query: { universityId: course.universityId },
      }),
    ])

    universities = univRes.ok ? await univRes.json() : []
    courses = scopedCoursesRes.ok ? await scopedCoursesRes.json() : []
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")
    ) {
      throw err
    }
    notFound()
  }

  if (!course) {
    notFound()
  }

  return (
    <CourseDetailsClient
      course={course}
      universities={universities}
      courses={courses}
    />
  )
}
