import test from "node:test"
import assert from "node:assert/strict"
import * as React from "react"
import type { CourseFilterDropdownProps } from "../components/course-filter-dropdown.js"
import { clickElement, setupDom } from "./dom.js"
import { SAMPLE_COURSES, SAMPLE_UNIVERSITIES } from "./fixtures.js"

function findOptionByText(doc: Document, text: string): HTMLElement | null {
  const items = Array.from(
    doc.querySelectorAll<HTMLElement>("[data-slot='select-item']")
  )
  return items.find((item) => item.textContent?.includes(text) ?? false) ?? null
}

test("CourseFilterDropdown opens, selects university and course without premature dismissal, and clears active filters", async () => {
  const dom = setupDom()
  const { CourseFilterDropdown } =
    await import("../components/course-filter-dropdown.js")

  function Harness({
    onFilterLog,
  }: {
    onFilterLog?: (filters: {
      universityId: string | null
      courseId: string | null
    }) => void
  }) {
    const [universityId, setUniversityId] = React.useState<string | null>(null)
    const [courseId, setCourseId] = React.useState<string | null>(null)

    const props: CourseFilterDropdownProps = {
      universities: SAMPLE_UNIVERSITIES,
      courses: SAMPLE_COURSES,
      selectedUniversityId: universityId,
      selectedCourseId: courseId,
      onFilterChange: (next) => {
        setUniversityId(next.universityId)
        setCourseId(next.courseId)
        onFilterLog?.(next)
      },
    }

    return React.createElement(CourseFilterDropdown, props)
  }

  const filterEvents: Array<{
    universityId: string | null
    courseId: string | null
  }> = []

  try {
    await dom.render(
      React.createElement(Harness, {
        onFilterLog: (filters) => filterEvents.push(filters),
      })
    )

    const triggerButton = dom.document.querySelector(
      "[data-testid='filter-by-course-button']"
    )
    assert.ok(triggerButton, "Filter trigger button should render")
    assert.match(triggerButton.textContent ?? "", /Filter by course/)

    // Popover should initially be closed
    assert.equal(
      dom.document.querySelector(
        "[data-testid='course-filter-dropdown-popover']"
      ),
      null
    )

    // 1. Open the Course filter popover
    await clickElement(triggerButton)
    const popover = dom.document.querySelector(
      "[data-testid='course-filter-dropdown-popover']"
    )
    assert.ok(popover, "Course filter popover should open on trigger click")

    // Course select should be disabled until a university is chosen
    const courseTriggerBefore = dom.document.querySelector<HTMLButtonElement>(
      "[data-testid='filter-course-trigger']"
    )
    assert.ok(courseTriggerBefore)
    assert.equal(courseTriggerBefore.disabled, true)

    // 2. Open University select and select Addis Ababa University
    const uniTrigger = dom.document.querySelector(
      "[data-testid='filter-university-trigger']"
    )
    assert.ok(
      uniTrigger,
      "University select trigger should render inside popover"
    )
    await clickElement(uniTrigger)

    const aauOption = findOptionByText(dom.document, "Addis Ababa University")
    assert.ok(aauOption, "University option should render in SelectContent")
    await clickElement(aauOption)

    assert.deepEqual(filterEvents.at(-1), {
      universityId: "uni_aau",
      courseId: null,
    })

    // Popover must remain open after selecting a university!
    assert.ok(
      dom.document.querySelector(
        "[data-testid='course-filter-dropdown-popover']"
      ),
      "Popover should stay open after selecting a university"
    )
    assert.match(triggerButton.textContent ?? "", /Addis Ababa University/)

    // 3. Course select should now be enabled and scoped to AAU courses
    const courseTriggerAfter = dom.document.querySelector<HTMLButtonElement>(
      "[data-testid='filter-course-trigger']"
    )
    assert.ok(courseTriggerAfter)
    assert.equal(courseTriggerAfter.disabled, false)

    await clickElement(courseTriggerAfter)

    // ASTU course (SE301) must not appear; AAU course (CS101) must appear
    assert.equal(findOptionByText(dom.document, "SE301"), null)
    const cs101Option = findOptionByText(dom.document, "CS101")
    assert.ok(cs101Option, "Scoped course option CS101 should render")
    await clickElement(cs101Option)

    assert.deepEqual(filterEvents.at(-1), {
      universityId: "uni_aau",
      courseId: "course_cs101",
    })

    // Popover must remain open after selecting a course (no premature dismissal)
    assert.ok(
      dom.document.querySelector(
        "[data-testid='course-filter-dropdown-popover']"
      ),
      "Popover should remain open after selecting a course"
    )
    assert.match(
      triggerButton.textContent ?? "",
      /Addis Ababa University · CS101/
    )

    // 4. Clear active filters via the inline clear button
    const clearButton = dom.document.querySelector(
      "[aria-label='Clear course filter']"
    )
    assert.ok(clearButton, "Clear button should render when filter is active")
    await clickElement(clearButton)

    assert.deepEqual(filterEvents.at(-1), {
      universityId: null,
      courseId: null,
    })
    assert.match(triggerButton.textContent ?? "", /Filter by course/)
    assert.equal(
      dom.document.querySelector("[aria-label='Clear course filter']"),
      null
    )
  } finally {
    await dom.cleanup()
  }
})
