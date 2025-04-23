import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { commonColumns } from "./solution";

export const masterSolutions = sqliteTable("masterSolutions", {
  id: integer().primaryKey(),
  name: text({ mode: "text" }).unique().notNull(),
  description: text({ mode: "text" }).notNull(),
  isActive: integer({ mode: "boolean" }).default(true).notNull(),
  ...commonColumns,
});
