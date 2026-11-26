import { JSDOM } from "jsdom"
import * as React from "react"
import { createRoot, type Root } from "react-dom/client"

export interface DomEnvironment {
  window: JSDOM["window"]
  document: Document
  container: HTMLElement
  render: (element: React.ReactElement) => Promise<void>
  cleanup: () => Promise<void>
}

const DOM_GLOBALS = [
  "React",
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "SVGElement",
  "Element",
  "Node",
  "Text",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "PointerEvent",
  "CustomEvent",
  "MutationObserver",
  "ResizeObserver",
  "IntersectionObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "matchMedia",
] as const

export function setupDom(): DomEnvironment {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:3000",
    pretendToBeVisual: true,
  })

  const previous = new Map<string, PropertyDescriptor | undefined>()
  const globalObj = globalThis as Record<string, unknown>
  const previousActEnv = globalObj.IS_REACT_ACT_ENVIRONMENT

  const setGlobal = (key: string, value: unknown) => {
    if (!previous.has(key)) {
      previous.set(key, Object.getOwnPropertyDescriptor(globalObj, key))
    }
    Object.defineProperty(globalObj, key, {
      configurable: true,
      writable: true,
      value,
    })
  }

  const win = dom.window

  setGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  setGlobal("React", React)
  setGlobal("window", win)
  setGlobal("document", win.document)
  setGlobal("navigator", win.navigator)
  setGlobal("HTMLElement", win.HTMLElement)
  setGlobal("SVGElement", win.SVGElement)
  setGlobal("Element", win.Element)
  setGlobal("Node", win.Node)
  setGlobal("Text", win.Text)
  setGlobal("Event", win.Event)
  setGlobal("MouseEvent", win.MouseEvent)
  setGlobal("KeyboardEvent", win.KeyboardEvent)
  setGlobal("FocusEvent", win.FocusEvent)
  setGlobal("PointerEvent", win.MouseEvent)
  setGlobal("CustomEvent", win.CustomEvent)
  setGlobal("MutationObserver", win.MutationObserver)
  setGlobal("getComputedStyle", win.getComputedStyle.bind(win))
  setGlobal("requestAnimationFrame", win.requestAnimationFrame.bind(win))
  setGlobal("cancelAnimationFrame", win.cancelAnimationFrame.bind(win))
  setGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  setGlobal(
    "IntersectionObserver",
    class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  setGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  )

  const container = win.document.createElement("div")
  win.document.body.appendChild(container)

  let root: Root | null = createRoot(container)

  return {
    window: win,
    document: win.document,
    container,
    render: async (element: React.ReactElement) => {
      await React.act(async () => {
        root?.render(element)
      })
    },
    cleanup: async () => {
      await React.act(async () => {
        root?.unmount()
      })
      root = null
      dom.window.close()
      for (const key of DOM_GLOBALS) {
        const desc = previous.get(key)
        if (desc) {
          Object.defineProperty(globalObj, key, desc)
        } else {
          delete globalObj[key]
        }
      }
      if (previousActEnv === undefined) {
        delete globalObj.IS_REACT_ACT_ENVIRONMENT
      } else {
        globalObj.IS_REACT_ACT_ENVIRONMENT = previousActEnv
      }
    },
  }
}

export async function clickElement(el: Element): Promise<void> {
  await React.act(async () => {
    if (el instanceof HTMLElement) {
      el.click()
    } else {
      el.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      )
    }
  })
}
