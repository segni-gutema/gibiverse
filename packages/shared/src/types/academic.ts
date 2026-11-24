import { z } from "zod"
import type { CourseMaterialType } from "./course-material.js"

export type University = {
  id: string
  name: string
}

export type Department = {
  id: string
  name: string
  universityId: string
}

export type Course = {
  id: string
  name: string
  code: string
  universityId: string
  departmentId: string
}

export type CourseSummary = {
  id: string
  name: string
  code: string
  universityId: string
  universityName: string
  departmentId: string
  departmentName: string
  materialsCount: number
  questionsCount: number
}

export type ScopedCourseMaterial = {
  id: string
  title: string
  courseMaterialType: CourseMaterialType
  academicPeriod: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string | Date
}

export type ScopedQuestion = {
  id: string
  title: string
  body: string
  voteScore: number
  answerCount: number
  acceptedAnswerId: string | null
  createdAt: string | Date
}

export type CourseDetailsData = CourseSummary & {
  materials: ScopedCourseMaterial[]
  questions: ScopedQuestion[]
}

export const courseQuerySchema = z.object({
  universityId: z.string().optional(),
  departmentId: z.string().optional(),
})

export type CourseQuery = z.infer<typeof courseQuerySchema>
