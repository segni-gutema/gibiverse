import "dotenv/config"
import db, { pool } from "./index.js"
import { university, department, course } from "./schema/academic.js"

const UNIVERSITY_ID = "uni_gibiverse_demo"
const DEPARTMENTS = [
  {
    id: "dept_cs",
    name: "Computer Science",
    courses: [
      { id: "course_cs201", code: "CS201", name: "Data Structures" },
      {
        id: "course_cs101",
        code: "CS101",
        name: "Introduction to Programming",
      },
      { id: "course_cs301", code: "CS301", name: "Algorithms" },
    ],
  },
  {
    id: "dept_math",
    name: "Mathematics",
    courses: [
      { id: "course_ma101", code: "MA101", name: "Calculus I" },
      { id: "course_ma201", code: "MA201", name: "Linear Algebra" },
    ],
  },
  {
    id: "dept_ee",
    name: "Electrical Engineering",
    courses: [
      { id: "course_ee101", code: "EE101", name: "Circuit Analysis" },
      { id: "course_ee210", code: "EE210", name: "Digital Logic" },
    ],
  },
] as const

async function seed() {
  await db
    .insert(university)
    .values({
      id: UNIVERSITY_ID,
      name: "Gibiverse University",
    })
    .onConflictDoNothing()

  for (const dept of DEPARTMENTS) {
    await db
      .insert(department)
      .values({
        id: dept.id,
        name: dept.name,
        universityId: UNIVERSITY_ID,
      })
      .onConflictDoNothing()

    for (const c of dept.courses) {
      await db
        .insert(course)
        .values({
          id: c.id,
          name: c.name,
          code: c.code,
          universityId: UNIVERSITY_ID,
          departmentId: dept.id,
        })
        .onConflictDoNothing()
    }
  }

  console.log(
    `Seeded university "${UNIVERSITY_ID}" with ${DEPARTMENTS.length} departments and ${DEPARTMENTS.reduce((n, d) => n + d.courses.length, 0)} courses (including CS201).`
  )
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
