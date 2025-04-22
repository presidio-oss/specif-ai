import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/master",
  schema: "./db/schema/master.ts",
  dialect: "sqlite"
});
