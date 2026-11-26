import test from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server.js"
import { proxy } from "../proxy"

test("Authenticated student visiting /sign-in is redirected to /", () => {
  const req = new NextRequest("http://localhost:3000/sign-in", {
    headers: {
      cookie: "better-auth.session_token=test-token-12345",
    },
  })

  const res = proxy(req)
  assert.strictEqual(res.status, 307)
  assert.strictEqual(res.headers.get("location"), "http://localhost:3000/")
})

test("Authenticated student visiting /sign-up is redirected to /", () => {
  const req = new NextRequest("http://localhost:3000/sign-up", {
    headers: {
      cookie: "better-auth.session_token=test-token-12345",
    },
  })

  const res = proxy(req)
  assert.strictEqual(res.status, 307)
  assert.strictEqual(res.headers.get("location"), "http://localhost:3000/")
})

test("Unauthenticated student visiting protected action is redirected to /sign-in with callbackUrl", () => {
  const req = new NextRequest(
    "http://localhost:3000/course-materials/upload?course=CS101"
  )
  const res = proxy(req)

  assert.strictEqual(res.status, 307)
  const location = res.headers.get("location")
  assert.ok(location)
  assert.match(location, /\/sign-in\?callbackUrl=/)
  assert.ok(
    location.includes(
      encodeURIComponent("/course-materials/upload?course=CS101")
    )
  )
})

test("Unauthenticated student visiting /sign-in is allowed through", () => {
  const req = new NextRequest("http://localhost:3000/sign-in")
  const res = proxy(req)

  // Returns next() with no redirect
  assert.strictEqual(res.headers.get("location"), null)
})
