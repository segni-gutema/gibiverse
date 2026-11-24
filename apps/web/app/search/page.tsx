import { Search } from "lucide-react"
import { client } from "@gibiverse/api-client"
import {
  courseMaterialTypeSchema,
  searchSortSchema,
} from "@gibiverse/shared/types"
import {
  type SearchType,
  type SearchResponse,
  type SearchFilterParams,
  emptySearchResponse,
} from "./presentation"
import { SearchClient } from "./search-client"
import type { Department, University, Course } from "@/app/courses/presentation"

export const dynamic = "force-dynamic"

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    universityId?: string
    departmentId?: string
    courseId?: string
    courseMaterialType?: string
    sort?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q?.trim() || ""
  const rawType = params.type?.trim()
  const type: SearchType =
    rawType === "resources" || rawType === "questions" || rawType === "courses"
      ? rawType
      : "all"

  const parsedMaterialType = courseMaterialTypeSchema.safeParse(
    params.courseMaterialType?.trim()
  )
  const parsedSort = searchSortSchema.safeParse(params.sort?.trim())

  const initialFilters: SearchFilterParams = {
    universityId: type !== "all" ? params.universityId?.trim() || null : null,
    departmentId: type === "courses" ? params.departmentId?.trim() || null : null,
    courseId:
      type === "resources" || type === "questions"
        ? params.courseId?.trim() || null
        : null,
    courseMaterialType:
      type === "resources" && parsedMaterialType.success
        ? parsedMaterialType.data
        : null,
    sort:
      (type === "questions" || type === "courses") && parsedSort.success
        ? parsedSort.data
        : null,
  }

  let data: SearchResponse = emptySearchResponse(type)
  let universities: University[] = []
  let departments: Department[] = []
  let courses: Course[] = []

  try {
    const [univRes, deptRes, courseRes, searchRes] = await Promise.all([
      client.api.universities.$get().catch(() => null),
      client.api.departments.$get().catch(() => null),
      client.api.courses.$get().catch(() => null),
      query
        ? client.api.search
            .$get({
              query: {
                q: query,
                type,
                universityId: initialFilters.universityId || undefined,
                departmentId: initialFilters.departmentId || undefined,
                courseId: initialFilters.courseId || undefined,
                courseMaterialType: parsedMaterialType.success
                  ? parsedMaterialType.data
                  : undefined,
                sort: parsedSort.success ? parsedSort.data : undefined,
              },
            })
            .catch(() => null)
        : Promise.resolve(null),
    ])

    if (univRes && univRes.ok) universities = await univRes.json()
    if (deptRes && deptRes.ok) departments = await deptRes.json()
    if (courseRes && courseRes.ok) courses = (await courseRes.json()) as Course[]
    if (searchRes && searchRes.ok) {
      data = (await searchRes.json()) as SearchResponse
    }
  } catch {
    // Graceful fallback for offline build / disconnected API
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Search className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Platform Search
          </h1>
          <p className="text-sm text-muted-foreground">
            Search course materials, questions, and courses across the platform.
          </p>
        </div>
      </div>

      <SearchClient
        initialQuery={query}
        initialType={type}
        initialData={data}
        initialFilters={initialFilters}
        universities={universities}
        departments={departments}
        courses={courses}
      />
    </div>
  )
}
