import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { commonColumns } from "./solution.schema";

export const masterSolutions = sqliteTable("masterSolutions", {
  id: integer().primaryKey(),
  name: text({ mode: "text" }).notNull(),
  description: text({ mode: "text" }).notNull(),
  solutionPath: text({ mode: "text" }).notNull().unique(),
  isActive: integer({ mode: "boolean" }).default(true).notNull(),
  ...commonColumns,
});
