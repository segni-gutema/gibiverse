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
    const [courseRes, univRes, allCoursesRes] = await Promise.all([
      (
        client.api.courses as unknown as {
          ":id": {
            $get: (args: { param: { id: string } }) => Promise<Response>
          }
        }
      )[":id"].$get({ param: { id } }),
      client.api.universities.$get(),
      client.api.courses.$get(),
    ])

    if (!courseRes.ok) {
      notFound()
    }

    course = (await courseRes.json()) as CourseDetailsData
    universities = univRes.ok ? await univRes.json() : []
    courses = allCoursesRes.ok ? await allCoursesRes.json() : []
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
