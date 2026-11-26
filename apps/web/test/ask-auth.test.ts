import test from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server.js"
import { proxy } from "../proxy"
import {
  ASK_QUESTION_PATH,
  getAskSignInHref,
} from "../app/questions/presentation.js"

test("getAskSignInHref encodes callback URL for ask question", () => {
  assert.strictEqual(
    getAskSignInHref(),
    `/sign-in?callbackUrl=${encodeURIComponent(ASK_QUESTION_PATH)}`
  )
  assert.strictEqual(
    getAskSignInHref("/questions"),
    `/sign-in?callbackUrl=${encodeURIComponent("/questions")}`
  )
})

test("Unauthenticated Ask a Question deep link redirects to sign-in with callbackUrl", () => {
  const req = new NextRequest(`http://localhost:3000${ASK_QUESTION_PATH}`)
  const res = proxy(req)

  assert.strictEqual(res.status, 307)
  const location = res.headers.get("location")
  assert.ok(location)
  assert.match(location, /\/sign-in\?callbackUrl=/)
  assert.ok(location.includes(encodeURIComponent(ASK_QUESTION_PATH)))
})
