import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/solution",
  schema: "./db/solution.schema.ts",
  dialect: "sqlite",
});
