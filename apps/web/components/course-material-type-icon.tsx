import { BookOpen, File, FileText, Presentation } from "lucide-react"
import { cn } from "@gibiverse/ui/lib/utils"

/**
 * Renders a fallback icon representing the given course material type.
 */
export function CourseMaterialTypeIcon({
  courseMaterialType,
  className,
}: {
  courseMaterialType: string
  className?: string
}) {
  const cls = cn("size-8 text-muted-foreground/60", className)
  switch (courseMaterialType) {
    case "exam":
    case "notes":
    case "assignment":
      return <FileText className={cls} />
    case "slides":
      return <Presentation className={cls} />
    case "lab":
      return <BookOpen className={cls} />
    default:
      return <File className={cls} />
  }
}
