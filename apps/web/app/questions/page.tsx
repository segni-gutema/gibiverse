import { MessageSquareQuote } from "lucide-react"
import { AskQuestionButton } from "@/components/ask-question-button"
import { client } from "@gibiverse/api-client"
import { QuestionCatalogClient } from "./question-catalog-client"

export default async function QuestionsPage() {
  const [univRes, courseRes, questionsRes] = await Promise.all([
    client.api.universities.$get(),
    client.api.courses.$get(),
    client.api.questions.$get(),
  ])

  const universities = univRes.ok ? await univRes.json() : []
  const courses = courseRes.ok ? await courseRes.json() : []
  const questions = questionsRes.ok ? await questionsRes.json() : []

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquareQuote className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Course Q&amp;A
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse academic questions by course and ask peers for help.
            </p>
          </div>
        </div>
        <AskQuestionButton universities={universities} courses={courses} />
      </div>

      <QuestionCatalogClient
        universities={universities}
        courses={courses}
        initialQuestions={questions}
      />
    </div>
  )
}
