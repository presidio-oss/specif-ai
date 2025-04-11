import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { metadata } from "./solution.schema";

const commonColumns = {
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
};

export const masterSolutions = sqliteTable("MasterSolutions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  solutionPath: text("solution_path").notNull().unique(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  ...commonColumns,
});
