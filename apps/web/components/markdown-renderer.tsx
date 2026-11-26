"use client"

import * as React from "react"
import { parseMarkdownToNodes, type MarkdownNode } from "@/lib/markdown"

function renderInlineText(text: string): React.ReactNode[] {
  // Regex tokens: inline code, bold, italic, links
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(tokenRegex)

  return parts.map((part, idx) => {
    if (!part) return null

    // Inline code
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    // Bold
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }

    // Italic
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      )
    }

    // Link [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      const href = linkMatch[2]!.trim()
      const isSafe = /^(https?:|\/|#|mailto:)/i.test(href)
      if (!isSafe) {
        return <React.Fragment key={idx}>{linkMatch[1]}</React.Fragment>
      }
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
        >
          {linkMatch[1]}
        </a>
      )
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

export function MarkdownRenderer({
  content,
  className = "",
}: {
  content: string
  className?: string
}) {
  const nodes = React.useMemo(() => parseMarkdownToNodes(content), [content])

  if (!content?.trim()) {
    return null
  }

  return (
    <div className={`space-y-3 text-foreground ${className}`}>
      {nodes.map((node, i) => {
        switch (node.type) {
          case "heading": {
            if (node.level === 1) {
              return (
                <h1 key={i} className="text-2xl font-bold tracking-tight">
                  {renderInlineText(node.text)}
                </h1>
              )
            }
            if (node.level === 2) {
              return (
                <h2 key={i} className="text-xl font-semibold tracking-tight">
                  {renderInlineText(node.text)}
                </h2>
              )
            }
            return (
              <h3 key={i} className="text-lg font-medium">
                {renderInlineText(node.text)}
              </h3>
            )
          }

          case "paragraph":
            return (
              <p key={i} className="leading-relaxed text-muted-foreground">
                {renderInlineText(node.text)}
              </p>
            )

          case "code_block":
            return (
              <div
                key={i}
                className="overflow-hidden rounded-md border bg-muted/60"
              >
                {node.language ? (
                  <div className="border-b px-3 py-1 font-mono text-xs text-muted-foreground">
                    {node.language}
                  </div>
                ) : null}
                <pre className="overflow-x-auto p-3 font-mono text-xs text-foreground sm:text-sm">
                  <code>{node.code}</code>
                </pre>
              </div>
            )

          case "blockquote":
            return (
              <blockquote
                key={i}
                className="border-l-4 border-primary/40 pl-4 text-muted-foreground italic"
              >
                {renderInlineText(node.text)}
              </blockquote>
            )

          case "list": {
            const ListTag = node.ordered ? "ol" : "ul"
            const listClass = node.ordered
              ? "list-decimal pl-5 space-y-1 text-muted-foreground"
              : "list-disc pl-5 space-y-1 text-muted-foreground"
            return (
              <ListTag key={i} className={listClass}>
                {node.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInlineText(item)}</li>
                ))}
              </ListTag>
            )
          }

          default:
            return null
        }
      })}
    </div>
  )
}
