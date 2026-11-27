"use client"

import * as React from "react"

export interface UseFilteredCatalogOptions<T, F> {
  initialData: T[]
  initialFilters: F
  fetcher: (filters: F, signal: AbortSignal) => Promise<T[]>
  isDefaultFilter: (filters: F) => boolean
}

export interface UseFilteredCatalogResult<T, F> {
  data: T[]
  isLoading: boolean
  error: string | null
  filters: F
  setFilters: React.Dispatch<React.SetStateAction<F>>
  resetFilters: () => void
  hasActiveFilters: boolean
}

/**
 * Manages client-side catalog filtering over server-rendered initial data,
 * handling loading/error state and AbortController cancellation on filter changes.
 */
export function useFilteredCatalog<T, F>({
  initialData,
  initialFilters,
  fetcher,
  isDefaultFilter,
}: UseFilteredCatalogOptions<T, F>): UseFilteredCatalogResult<T, F> {
  const [filters, setFilters] = React.useState<F>(initialFilters)
  const [data, setData] = React.useState<T[]>(initialData)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isFirstRender = React.useRef(true)
  const initialFiltersRef = React.useRef(initialFilters)
  const fetcherRef = React.useRef(fetcher)

  React.useEffect(() => {
    fetcherRef.current = fetcher
  })

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    fetcherRef
      .current(filters, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) {
          setData(next)
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(
          err instanceof Error
            ? err.message
            : "Could not load results. Please try again."
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [filters])

  const resetFilters = React.useCallback(() => {
    setFilters(initialFiltersRef.current)
  }, [])

  const hasActiveFilters = !isDefaultFilter(filters)

  return {
    data,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
  }
}
