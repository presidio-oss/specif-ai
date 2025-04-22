import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/solution",
  schema: "./db/schema/solution.ts",
  dialect: "sqlite",
});
