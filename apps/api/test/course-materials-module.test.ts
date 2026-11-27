import test, { after, before } from "node:test"
import assert from "node:assert/strict"
import { eq } from "drizzle-orm"
import db from "../src/db/index.js"
import { university, department, course } from "../src/db/schema/academic.js"
import { user as studentTable } from "../src/db/schema/auth.js"
import { courseMaterial } from "../src/db/schema/course-material.js"
import { createCourseMaterials } from "../src/modules/course-materials/index.js"
import type { StorageProvider } from "../src/storage/types.js"

// ---------------------------------------------------------------------------
// In-memory StorageProvider adapter for tests
// ---------------------------------------------------------------------------

class InMemoryStorage implements StorageProvider {
  private store = new Map<string, { data: Buffer; contentType: string }>()

  async put(
    key: string,
    data: Buffer | ReadableStream<Uint8Array>,
    opts?: { contentType?: string }
  ) {
    const buffer = Buffer.isBuffer(data)
      ? data
      : await this.streamToBuffer(data)
    this.store.set(key, {
      data: buffer,
      contentType: opts?.contentType ?? "application/octet-stream",
    })
    return { key, size: buffer.byteLength }
  }

  async get(key: string) {
    const entry = this.store.get(key)
    if (!entry) return null
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(entry.data))
        controller.close()
      },
    })
    return {
      stream,
      contentType: entry.contentType,
      size: entry.data.byteLength,
    }
  }

  async delete(key: string) {
    this.store.delete(key)
  }

  async exists(key: string) {
    return this.store.has(key)
  }

  async getUrl(
    key: string,
    opts?: { expiresIn?: number; disposition?: "inline" | "attachment" }
  ) {
    return `/fake/${key}?disposition=${opts?.disposition ?? "inline"}`
  }

  has(key: string) {
    return this.store.has(key)
  }

  private async streamToBuffer(
    stream: ReadableStream<Uint8Array>
  ): Promise<Buffer> {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)))
  }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const suffix = Date.now()
const uniId = `uni_cmmod_${suffix}`
const deptId = `dept_cmmod_${suffix}`
const courseId = `course_cmmod_${suffix}`
const courseCode = `CM${String(suffix).slice(-3)}`
const studentId = `stu_cmmod_${suffix}`
const student = { id: studentId, name: "Course Material Author" }

const storage = new InMemoryStorage()
const courseMaterials = createCourseMaterials({ db, storage })
const createdMaterialIds: string[] = []

function pdfFile(
  name = "midterm.pdf",
  size?: number
): {
  name: string
  size: number
  type: string
  data: Buffer
} {
  const data = Buffer.from("%PDF-1.4 test content")
  return {
    name,
    size: size ?? data.byteLength,
    type: "application/pdf",
    data,
  }
}

before(async () => {
  await db.insert(university).values({
    id: uniId,
    name: `CmModule Uni ${suffix}`,
  })
  await db.insert(department).values({
    id: deptId,
    name: `CmModule Dept ${suffix}`,
    universityId: uniId,
  })
  await db.insert(course).values({
    id: courseId,
    name: "CmModule Course",
    code: courseCode,
    universityId: uniId,
    departmentId: deptId,
  })
  await db.insert(studentTable).values({
    id: studentId,
    name: student.name,
    email: `cmmod_${suffix}@university.edu`,
    emailVerified: true,
  })
})

after(async () => {
  for (const id of createdMaterialIds) {
    await db.delete(courseMaterial).where(eq(courseMaterial.id, id))
  }
  await db.delete(studentTable).where(eq(studentTable.id, studentId))
  await db.delete(course).where(eq(course.id, courseId))
  await db.delete(department).where(eq(department.id, deptId))
  await db.delete(university).where(eq(university.id, uniId))
})

// ---------------------------------------------------------------------------
// upload
// ---------------------------------------------------------------------------

test("upload stores a Course Material for a Course under course-materials/ storage key", async () => {
  const result = await courseMaterials.upload({
    student,
    title: "CS Midterm 2024",
    courseId,
    courseMaterialType: "exam",
    academicPeriod: "2024/2025 semester 1",
    file: pdfFile("cs-midterm.pdf"),
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  createdMaterialIds.push(result.data.id)

  assert.equal(result.data.title, "CS Midterm 2024")
  assert.equal(result.data.courseId, courseId)
  assert.equal(result.data.userId, student.id)
  assert.equal(result.data.courseMaterialType, "exam")
  assert.equal(result.data.academicPeriod, "2024/2025 semester 1")
  assert.equal(result.data.fileName, "cs-midterm.pdf")
  assert.ok(result.data.filePath.startsWith("course-materials/"))
  assert.ok(storage.has(result.data.filePath))
})

test("upload rejects empty title", async () => {
  const result = await courseMaterials.upload({
    student,
    title: "   ",
    courseId,
    courseMaterialType: "exam",
    academicPeriod: "2024/2025 semester 1",
    file: pdfFile(),
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "validation")
  assert.match(result.error.message, /title/i)
})

test("upload rejects unknown Course", async () => {
  const result = await courseMaterials.upload({
    student,
    title: "CS Midterm",
    courseId: "nonexistent_course",
    courseMaterialType: "exam",
    academicPeriod: "2024/2025 semester 1",
    file: pdfFile(),
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "validation")
  assert.match(result.error.message, /course/i)
})

test("upload rejects invalid Course Material Type", async () => {
  const result = await courseMaterials.upload({
    student,
    title: "CS Midterm",
    courseId,
    courseMaterialType: "invalid-type",
    academicPeriod: "2024/2025 semester 1",
    file: pdfFile(),
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "validation")
  assert.match(result.error.message, /course material type/i)
})

test("upload rejects invalid file extension", async () => {
  const result = await courseMaterials.upload({
    student,
    title: "Executable file",
    courseId,
    courseMaterialType: "other",
    academicPeriod: "2024/2025 semester 1",
    file: {
      name: "danger.exe",
      size: 1024,
      type: "application/x-msdownload",
      data: Buffer.from("MZ"),
    },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "validation")
})

test("upload rejects invalid academic period", async () => {
  const result = await courseMaterials.upload({
    student,
    title: "Old Exam",
    courseId,
    courseMaterialType: "exam",
    academicPeriod: "invalid-period",
    file: pdfFile(),
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "validation")
  assert.match(result.error.message, /academic period/i)
})

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

test("list returns Course Materials and filters by Course", async () => {
  const up1 = await courseMaterials.upload({
    student,
    title: "List Test Exam",
    courseId,
    courseMaterialType: "exam",
    academicPeriod: "2024/2025 semester 1",
    file: pdfFile("exam1.pdf"),
  })
  assert.equal(up1.ok, true)
  if (up1.ok) createdMaterialIds.push(up1.data.id)

  const up2 = await courseMaterials.upload({
    student,
    title: "List Test Notes",
    courseId,
    courseMaterialType: "notes",
    academicPeriod: "2024/2025 semester 1",
    file: pdfFile("notes1.pdf"),
  })
  assert.equal(up2.ok, true)
  if (up2.ok) createdMaterialIds.push(up2.data.id)

  const listAll = await courseMaterials.list({ courseId })
  assert.equal(listAll.ok, true)
  if (!listAll.ok) return

  const titles = listAll.data.map((r) => r.title)
  assert.ok(titles.includes("List Test Exam"))
  assert.ok(titles.includes("List Test Notes"))

  const listExams = await courseMaterials.list({
    courseId,
    courseMaterialType: "exam",
  })
  assert.equal(listExams.ok, true)
  if (!listExams.ok) return
  assert.ok(listExams.data.every((r) => r.courseMaterialType === "exam"))
})

test("list rejects invalid Course Material Type", async () => {
  const result = await courseMaterials.list({
    courseMaterialType: "invalid-type",
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "validation")
})

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

test("get returns Course Material detail with Course and Student", async () => {
  const uploaded = await courseMaterials.upload({
    student,
    title: "Get Detail Test",
    courseId,
    courseMaterialType: "slides",
    academicPeriod: "2024/2025 semester 2",
    file: pdfFile("lecture01.pdf"),
  })
  assert.equal(uploaded.ok, true)
  if (!uploaded.ok) return
  createdMaterialIds.push(uploaded.data.id)

  const detail = await courseMaterials.get(uploaded.data.id)
  assert.equal(detail.ok, true)
  if (!detail.ok) return

  assert.equal(detail.data.title, "Get Detail Test")
  assert.equal(detail.data.courseMaterialType, "slides")
  assert.equal(detail.data.academicPeriod, "2024/2025 semester 2")
  assert.equal(detail.data.courseId, courseId)
  assert.equal(detail.data.courseCode, courseCode)
  assert.equal(detail.data.studentId, student.id)
  assert.equal(detail.data.studentName, student.name)
})

test("get returns not_found for unknown Course Material", async () => {
  const result = await courseMaterials.get("nonexistent_id")
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "not_found")
})

// ---------------------------------------------------------------------------
// stream
// ---------------------------------------------------------------------------

test("stream returns file content from storage for new course-materials path", async () => {
  const uploaded = await courseMaterials.upload({
    student,
    title: "Stream Test Course Material",
    courseId,
    courseMaterialType: "exam",
    academicPeriod: "2024/2025 semester 1",
    file: pdfFile("stream-test.pdf"),
  })
  assert.equal(uploaded.ok, true)
  if (!uploaded.ok) return
  createdMaterialIds.push(uploaded.data.id)

  const result = await courseMaterials.stream(uploaded.data.id)
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.equal(result.data.contentType, "application/pdf")
  assert.equal(result.data.fileName, "stream-test.pdf")
  assert.ok(result.data.size > 0)
  assert.ok(result.data.stream instanceof ReadableStream)
})

test("stream resolves existing legacy resources/ storage paths with zero data loss", async () => {
  // Directly insert a record pointing to a legacy resources/{id}/... path
  const legacyId = `legacy_res_${suffix}`
  const legacyPath = `resources/${legacyId}/legacy.pdf`
  const content = Buffer.from("%PDF-1.4 legacy resource content")
  await storage.put(legacyPath, content, {
    contentType: "application/pdf",
  })

  await db.insert(courseMaterial).values({
    id: legacyId,
    title: "Legacy Stored Resource",
    courseId,
    userId: studentId,
    courseMaterialType: "notes",
    academicPeriod: "2023/2024 semester 1",
    filePath: legacyPath,
    fileName: "legacy.pdf",
    mimeType: "application/pdf",
    fileSize: content.length,
  })
  createdMaterialIds.push(legacyId)

  // Verify stream retrieves content from the legacy path seamlessly
  const result = await courseMaterials.stream(legacyId)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.data.fileName, "legacy.pdf")
  assert.equal(result.data.size, content.length)
})

test("stream returns not_found for unknown Course Material", async () => {
  const result = await courseMaterials.stream("nonexistent_id")
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.code, "not_found")
})
