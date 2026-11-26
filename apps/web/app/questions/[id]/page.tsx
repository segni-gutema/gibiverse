import { notFound } from "next/navigation"
import { client } from "@gibiverse/api-client"
import { QuestionDiscussion } from "@/components/question-discussion"

type QuestionPageProps = {
  params: Promise<{ id: string }>
}

export default async function QuestionDetailPage({
  params,
}: QuestionPageProps) {
  const { id } = await params
  const res = await client.api.questions[":id"]
    .$get({
      param: { id },
    })
    .catch(() => null)

  if (!res || !res.ok) {
    notFound()
  }

  const question = await res.json()

  return <QuestionDiscussion initialQuestion={question} />
}
