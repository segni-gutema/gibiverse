import { relations } from "drizzle-orm/_relations"
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { course } from "./academic.js"
import { user } from "./auth.js"

export const courseMaterial = pgTable("course_material", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  courseId: text("course_id")
    .notNull()
    .references(() => course.id),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  courseMaterialType: text("course_material_type").notNull(),
  academicPeriod: text("academic_period").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const courseMaterialRelations = relations(courseMaterial, ({ one }) => ({
  course: one(course, {
    fields: [courseMaterial.courseId],
    references: [course.id],
  }),
  author: one(user, {
    fields: [courseMaterial.userId],
    references: [user.id],
  }),
}))
