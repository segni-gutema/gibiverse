import { Library } from "lucide-react"
import { client } from "@gibiverse/api-client"
import { CourseDirectoryClient } from "./course-directory-client"

export const dynamic = "force-dynamic"

export default async function CoursesPage() {
  let universities: Array<{ id: string; name: string }> = []
  let departments: Array<{ id: string; name: string; universityId: string }> = []
  let courses: Array<{
    id: string
    name: string
    code: string
    universityId: string
    departmentId: string
  }> = []

  try {
    const [univRes, deptRes, courseRes] = await Promise.all([
      client.api.universities.$get(),
      client.api.departments.$get(),
      client.api.courses.$get(),
    ])

    universities = univRes.ok ? await univRes.json() : []
    departments = deptRes.ok ? await deptRes.json() : []
    courses = courseRes.ok ? await courseRes.json() : []
  } catch {
    // Graceful fallback for offline build / disconnected API
  }

  const primaryUniversity = universities[0] ?? null
  const scopedDepartments = primaryUniversity
    ? departments.filter((d) => d.universityId === primaryUniversity.id)
    : departments

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Library className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Course Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse courses, explore materials, and participate in academic Q&amp;A.
          </p>
        </div>
      </div>

      <CourseDirectoryClient
        universities={universities}
        departments={scopedDepartments}
        courses={courses}
      />
    </div>
  )
}
