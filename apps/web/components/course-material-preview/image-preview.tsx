"use client"

export function ImagePreview({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="flex justify-center overflow-auto rounded-lg border border-border bg-muted/20 p-4"
      data-testid="preview-image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote preview stream; not a configured next/image host */}
      <img
        src={src}
        alt={alt}
        className="max-h-[70vh] w-auto max-w-full object-contain"
      />
    </div>
  )
}
