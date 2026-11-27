import test from "node:test"
import assert from "node:assert/strict"
import * as React from "react"
import { setupDom } from "./dom.js"
import {
  useFilteredCatalog,
  type UseFilteredCatalogResult,
} from "../hooks/use-filtered-catalog.js"

interface Item {
  id: string
  name: string
}

interface Filters {
  query: string | null
}

function createHarness(
  initialData: Item[],
  initialFilters: Filters,
  fetcher: (filters: Filters, signal: AbortSignal) => Promise<Item[]>,
  isDefaultFilter: (filters: Filters) => boolean
) {
  let latest: UseFilteredCatalogResult<Item, Filters> | null = null

  function Harness() {
    latest = useFilteredCatalog<Item, Filters>({
      initialData,
      initialFilters,
      fetcher,
      isDefaultFilter,
    })
    return null
  }

  return {
    Harness,
    getLatest: () => {
      if (!latest) throw new Error("Harness not mounted")
      return latest
    },
  }
}

test("useFilteredCatalog initializes with initialData and does not fetch on mount", async () => {
  const dom = setupDom()
  try {
    let fetchCalls = 0
    const initialData: Item[] = [{ id: "1", name: "Item 1" }]
    const initialFilters: Filters = { query: null }
    const { Harness, getLatest } = createHarness(
      initialData,
      initialFilters,
      async () => {
        fetchCalls++
        return []
      },
      (f) => f.query === null
    )

    await dom.render(React.createElement(Harness))

    const state = getLatest()
    assert.deepStrictEqual(state.data, initialData)
    assert.deepStrictEqual(state.filters, initialFilters)
    assert.strictEqual(state.isLoading, false)
    assert.strictEqual(state.error, null)
    assert.strictEqual(state.hasActiveFilters, false)
    assert.strictEqual(fetchCalls, 0)
  } finally {
    await dom.cleanup()
  }
})

test("useFilteredCatalog fetches updated data when filters change and updates hasActiveFilters", async () => {
  const dom = setupDom()
  try {
    const initialData: Item[] = [{ id: "1", name: "Item 1" }]
    const filteredData: Item[] = [{ id: "2", name: "Filtered" }]
    const seenFilters: Filters[] = []

    const { Harness, getLatest } = createHarness(
      initialData,
      { query: null },
      async (filters) => {
        seenFilters.push(filters)
        return filteredData
      },
      (f) => f.query === null
    )

    await dom.render(React.createElement(Harness))

    await React.act(async () => {
      getLatest().setFilters({ query: "math" })
    })

    const state = getLatest()
    assert.deepStrictEqual(seenFilters, [{ query: "math" }])
    assert.deepStrictEqual(state.data, filteredData)
    assert.strictEqual(state.isLoading, false)
    assert.strictEqual(state.error, null)
    assert.strictEqual(state.hasActiveFilters, true)
  } finally {
    await dom.cleanup()
  }
})

test("useFilteredCatalog aborts previous in-flight request when filters change rapidly", async () => {
  const dom = setupDom()
  try {
    const signals: AbortSignal[] = []
    let resolveFirst!: (items: Item[]) => void
    let resolveSecond!: (items: Item[]) => void

    const { Harness, getLatest } = createHarness(
      [{ id: "0", name: "Initial" }],
      { query: null },
      (filters, signal) => {
        signals.push(signal)
        if (filters.query === "first") {
          return new Promise<Item[]>((resolve) => {
            resolveFirst = resolve
          })
        }
        return new Promise<Item[]>((resolve) => {
          resolveSecond = resolve
        })
      },
      (f) => f.query === null
    )

    await dom.render(React.createElement(Harness))

    await React.act(async () => {
      getLatest().setFilters({ query: "first" })
    })
    assert.strictEqual(signals.length, 1)
    assert.strictEqual(signals[0]!.aborted, false)
    assert.strictEqual(getLatest().isLoading, true)

    await React.act(async () => {
      getLatest().setFilters({ query: "second" })
    })
    assert.strictEqual(signals.length, 2)
    assert.strictEqual(signals[0]!.aborted, true)
    assert.strictEqual(signals[1]!.aborted, false)

    // Resolving the aborted first request must not overwrite state
    await React.act(async () => {
      resolveFirst([{ id: "stale", name: "Stale" }])
    })
    assert.deepStrictEqual(getLatest().data, [{ id: "0", name: "Initial" }])

    // Resolving the second request updates data and clears loading
    await React.act(async () => {
      resolveSecond([{ id: "2", name: "Fresh" }])
    })
    assert.deepStrictEqual(getLatest().data, [{ id: "2", name: "Fresh" }])
    assert.strictEqual(getLatest().isLoading, false)
  } finally {
    await dom.cleanup()
  }
})

test("useFilteredCatalog surfaces error when fetcher rejects", async () => {
  const dom = setupDom()
  try {
    const { Harness, getLatest } = createHarness(
      [{ id: "1", name: "Item 1" }],
      { query: null },
      async () => {
        throw new Error("Could not load catalog")
      },
      (f) => f.query === null
    )

    await dom.render(React.createElement(Harness))

    await React.act(async () => {
      getLatest().setFilters({ query: "fail" })
    })

    const state = getLatest()
    assert.strictEqual(state.error, "Could not load catalog")
    assert.strictEqual(state.isLoading, false)
    assert.deepStrictEqual(state.data, [{ id: "1", name: "Item 1" }])
  } finally {
    await dom.cleanup()
  }
})

test("useFilteredCatalog resetFilters restores initialFilters and refetches", async () => {
  const dom = setupDom()
  try {
    const initialData: Item[] = [{ id: "1", name: "Initial" }]
    const seenFilters: Filters[] = []

    const { Harness, getLatest } = createHarness(
      initialData,
      { query: null },
      async (filters) => {
        seenFilters.push(filters)
        return filters.query ? [{ id: "2", name: "Filtered" }] : initialData
      },
      (f) => f.query === null
    )

    await dom.render(React.createElement(Harness))

    await React.act(async () => {
      getLatest().setFilters({ query: "cs101" })
    })
    assert.strictEqual(getLatest().hasActiveFilters, true)

    await React.act(async () => {
      getLatest().resetFilters()
    })

    const state = getLatest()
    assert.deepStrictEqual(state.filters, { query: null })
    assert.strictEqual(state.hasActiveFilters, false)
    assert.deepStrictEqual(state.data, initialData)
    assert.deepStrictEqual(seenFilters, [{ query: "cs101" }, { query: null }])
  } finally {
    await dom.cleanup()
  }
})
