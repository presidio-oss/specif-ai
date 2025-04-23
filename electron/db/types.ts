import { drizzle } from "drizzle-orm/libsql";
import { z } from "zod";

export type Database = ReturnType<typeof drizzle>;

export const solutionIdSchema = z.object({
    solutionId: z.number(),
})

export const documentIdSchema = solutionIdSchema.extend({
    documentId: z.number(),
})