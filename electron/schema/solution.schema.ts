import { z } from "zod";

export const solutionIdSchema = z.object({
    solutionId: z.number(),
});

export const documentIdSchema = solutionIdSchema.extend({
    documentId: z.number(),
});

export const searchQuerySchema = solutionIdSchema.extend({
    searchQuery: z.string().optional()
});

export const documentRequestSchema = solutionIdSchema.extend({
    documentData: z.object({
        documentNumber: z.string(),
        name: z.string(),
        description: z.string(),
        jiraId: z.string().optional(),
        documentTypeId: z.string().optional()
    }),
    linkedDocumentIds: z.array(z.number()).default([])
});
