"use client"

import * as React from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@gibiverse/ui/components/button"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

export function PdfPreview({ fileUrl }: { fileUrl: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = React.useState(0)
  const [pageNumber, setPageNumber] = React.useState(1)
  const [pageWidth, setPageWidth] = React.useState(720)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateWidth = () => {
      const next = Math.max(280, Math.floor(node.clientWidth - 32))
      setPageWidth(next)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4"
      data-testid="preview-pdf"
    >
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <>
          <div className="flex justify-center overflow-auto">
            <Document
              file={fileUrl}
              loading={
                <p className="text-sm text-muted-foreground">Loading PDF…</p>
              }
              onLoadSuccess={({ numPages: next }) => {
                setNumPages(next)
                setPageNumber(1)
                setError(null)
              }}
              onLoadError={() => {
                setError("Could not load this PDF preview.")
              }}
              suspense={false}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                loading={
                  <p className="text-sm text-muted-foreground">
                    Rendering page…
                  </p>
                }
              />
            </Document>
          </div>
          {numPages > 0 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
              >
                Previous
              </Button>
              <p className="text-sm text-muted-foreground">
                Page {pageNumber} of {numPages}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((n) => Math.min(numPages, n + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
