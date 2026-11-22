import test from "node:test"
import assert from "node:assert/strict"
import { navItems, getAvatarInitials } from "../components/header.js"

test("navItems does not contain redundant Home link because logo navigates to home", () => {
  const hasHome = navItems.some(
    (item) => item.label.toLowerCase() === "home" || item.href === "/"
  )
  assert.equal(hasHome, false, "Home navigation link must be removed from global navigation")
})

test("navItems does not contain redundant Search link because search bar exists in header", () => {
  const hasSearch = navItems.some(
    (item) => item.label.toLowerCase() === "search" || item.href === "/search"
  )
  assert.equal(hasSearch, false, "Search navigation link must be removed from global navigation to prevent duplicate search controls")
})

test("navItems contains standard primary academic routes", () => {
  const labels = navItems.map((item) => item.label)
  assert.deepEqual(labels, ["Courses", "Course Materials", "Q&A"])

  const routes = navItems.map((item) => item.href)
  assert.deepEqual(routes, ["/courses", "/course-materials", "/questions"])
})

test("getAvatarInitials computes initials from student name, email, or fallback", () => {
  assert.equal(getAvatarInitials({ name: "Segni Gutema" }), "SG")
  assert.equal(getAvatarInitials({ name: "Alice" }), "A")
  assert.equal(getAvatarInitials({ email: "student@university.edu" }), "ST")
  assert.equal(getAvatarInitials({ email: "johndoe@example.com" }), "JO")
  assert.equal(getAvatarInitials({}), "ST")
  assert.equal(getAvatarInitials(undefined), "ST")
})
