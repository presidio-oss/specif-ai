import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/master",
  schema: "./db/master.schema.ts",
  dialect: "sqlite",
});
