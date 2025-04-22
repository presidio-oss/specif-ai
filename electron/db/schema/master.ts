import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const commonColumns = {
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
};

export const masterSolutions = sqliteTable("MasterSolutions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  solutionPath: text("solution_path").unique().notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  ...commonColumns,
});
