import test from "node:test"
import assert from "node:assert/strict"
import { NextRequest } from "next/server.js"
import { proxy } from "../proxy"
import {
  getUploadSignInHref,
  UPLOAD_COURSE_MATERIAL_PATH,
} from "../app/course-materials/presentation.js"

test("getUploadSignInHref encodes callback URL for upload", () => {
  assert.strictEqual(
    getUploadSignInHref(),
    `/sign-in?callbackUrl=${encodeURIComponent(UPLOAD_COURSE_MATERIAL_PATH)}`
  )
  assert.strictEqual(
    getUploadSignInHref("/course-materials"),
    `/sign-in?callbackUrl=${encodeURIComponent("/course-materials")}`
  )
})

test("Unauthenticated Upload Course Material deep link redirects to sign-in with callbackUrl", () => {
  const req = new NextRequest(
    `http://localhost:3000${UPLOAD_COURSE_MATERIAL_PATH}`
  )
  const res = proxy(req)

  assert.strictEqual(res.status, 307)
  const location = res.headers.get("location")
  assert.ok(location)
  assert.match(location, /\/sign-in\?callbackUrl=/)
  assert.ok(location.includes(encodeURIComponent(UPLOAD_COURSE_MATERIAL_PATH)))
})
