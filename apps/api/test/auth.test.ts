import test from "node:test"
import assert from "node:assert/strict"
import { app } from "../src/app.js"

test("POST /api/auth/sign-up/email registers student and returns session cookie", async () => {
  const uniqueEmail = `student_${Date.now()}@university.edu`
  const res = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Alex Doe",
      email: uniqueEmail,
      password: "SecurePassword123!",
    }),
  })

  assert.strictEqual(res.status, 200)
  const setCookie = res.headers.get("set-cookie")
  assert.ok(setCookie, "Response should set session cookie")
  assert.match(
    setCookie,
    /better-auth\.session_token/,
    "Cookie should contain session token"
  )
})

test("Student authentication lifecycle: sign-in, session query, and sign-out", async () => {
  const email = `lifecycle_${Date.now()}@university.edu`
  const password = "LifecyclePassword123!"

  // 1. Sign up first
  const signUpRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Lifecycle Student", email, password }),
  })
  assert.strictEqual(signUpRes.status, 200)

  // 2. Sign in with credentials
  const signInRes = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  assert.strictEqual(signInRes.status, 200)
  const sessionCookie = signInRes.headers.get("set-cookie")
  assert.ok(sessionCookie, "Sign-in must return session cookie")

  // Extract the raw cookie string for cookie header
  const cookieHeader = sessionCookie.split(";")[0]

  // 3. Get session with cookie
  const sessionRes = await app.request("/api/auth/get-session", {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
  })
  assert.strictEqual(sessionRes.status, 200)
  const sessionBody = (await sessionRes.json()) as { user?: { email: string } }
  assert.ok(sessionBody?.user)
  assert.strictEqual(sessionBody.user.email, email)

  // 4. Sign out (origin must be a trusted browser-facing origin)
  const signOutRes = await app.request("/api/auth/sign-out", {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      origin: "http://localhost:3000",
    },
  })
  assert.strictEqual(signOutRes.status, 200)

  // 5. Subsequent session query should return null / no user
  const sessionAfterSignOut = await app.request("/api/auth/get-session", {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
  })
  const afterBody = (await sessionAfterSignOut.json()) as {
    user?: unknown
  } | null
  assert.strictEqual(afterBody, null)
})

test("requireAuth middleware blocks unauthenticated requests and permits authenticated requests", async () => {
  // 1. Unauthenticated request to protected mutation should be 401
  const unauthRes = await app.request("/api/test-protected", {
    method: "POST",
  })
  assert.strictEqual(unauthRes.status, 401)
  const unauthBody = await unauthRes.json()
  assert.strictEqual(unauthBody.error, "Unauthorized")

  // 2. Authenticated request with session cookie should be 200
  const email = `guarded_${Date.now()}@university.edu`
  const password = "Password123!"
  const signUpRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Guarded Student", email, password }),
  })
  const setCookie = signUpRes.headers.get("set-cookie")!
  const cookieHeader = setCookie.split(";")[0]

  const authRes = await app.request("/api/test-protected", {
    method: "POST",
    headers: {
      cookie: cookieHeader,
    },
  })
  assert.strictEqual(authRes.status, 200)
  const authBody = await authRes.json()
  assert.strictEqual(authBody.success, true)
  assert.ok(authBody.studentId)
})

test("optionalAuth middleware provides student context when present and allows anonymous when absent", async () => {
  // 1. Anonymous request to public read route
  const anonRes = await app.request("/api/test-public", {
    method: "GET",
  })
  assert.strictEqual(anonRes.status, 200)
  const anonBody = await anonRes.json()
  assert.strictEqual(anonBody.authenticated, false)
  assert.strictEqual(anonBody.student, null)

  // 2. Authenticated request to public read route
  const email = `public_reader_${Date.now()}@university.edu`
  const password = "Password123!"
  const signUpRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Reader Student", email, password }),
  })
  const setCookie = signUpRes.headers.get("set-cookie")!
  const cookieHeader = setCookie.split(";")[0]

  const authRes = await app.request("/api/test-public", {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
  })
  assert.strictEqual(authRes.status, 200)
  const authBody = await authRes.json()
  assert.strictEqual(authBody.authenticated, true)
  assert.strictEqual(authBody.student.email, email)
})

test("POST /api/auth/sign-in/social initiates Google OAuth flow with redirect url", async () => {
  const res = await app.request("/api/auth/sign-in/social", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:8787",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL: "http://localhost:3000/",
    }),
  })

  assert.strictEqual(res.status, 200)
  const body = (await res.json()) as { url?: string }
  assert.ok(body.url, "Should return OAuth redirect URL")
  assert.match(
    body.url,
    /accounts\.google\.com|google/,
    "Should target Google OAuth authorization endpoint"
  )
})

test("Auth endpoints accept requests from frontend origin http://localhost:3001", async () => {
  const email = `port3001_${Date.now()}@university.edu`
  const password = "Port3001Password123!"

  // 1. Sign up with origin: http://localhost:3001
  const signUpRes = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3001",
    },
    body: JSON.stringify({ name: "Port 3001 Student", email, password }),
  })
  assert.strictEqual(
    signUpRes.status,
    200,
    "Sign up from http://localhost:3001 should succeed"
  )
  const sessionCookie = signUpRes.headers.get("set-cookie")!
  const cookieHeader = sessionCookie.split(";")[0]

  // 2. Sign in with origin: http://localhost:3001
  const signInRes = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3001",
    },
    body: JSON.stringify({ email, password }),
  })
  assert.strictEqual(
    signInRes.status,
    200,
    "Sign in from http://localhost:3001 should succeed"
  )

  // 3. Sign out with origin: http://localhost:3001
  const signOutRes = await app.request("/api/auth/sign-out", {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      origin: "http://localhost:3001",
    },
  })
  assert.strictEqual(
    signOutRes.status,
    200,
    "Sign out from http://localhost:3001 should succeed"
  )

  // 4. Social sign in with origin and callback on http://localhost:3001
  const socialRes = await app.request("/api/auth/sign-in/social", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3001",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL: "http://localhost:3001/",
    }),
  })
  assert.strictEqual(
    socialRes.status,
    200,
    "Social sign in from http://localhost:3001 should succeed"
  )
})
