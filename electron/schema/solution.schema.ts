import { DbDocumentType, PromptMode } from "../helper/constants";
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
        name: z.string(),
        description: z.string(),
        jiraId: z.string().optional(),
        documentTypeId: z.string().optional()
    }),
    linkedDocumentIds: z.array(z.number()).default([])
});

export const businessProcessIdSchema = solutionIdSchema.extend({
    businessProcessId: z.number(),
});

export type IDocumentEnhance = {
    documentData: {
        name?: string;
        description?: string;
        id?: string;
        jiraId?: string;
        documentTypeId: DbDocumentType;
    },
    solutionName?: string;
    solutionDescription?: string;
    fileContent?: string;
    mode: PromptMode;
}

export type IRequirementEnhance = IDocumentEnhance & {
    linkedDocuments?: { title: string; requirement: string }[],
}

export type IStoryEnhance = IDocumentEnhance & {
    prdName: string;
    prdDescription: string;
    newStoryDescription: string;
}

export type ITaskEnhance = IDocumentEnhance & {
    storyName: string;
    storyDescription: string;
    newTaskDescription?: string;
}

export type ILLMEnhance = IRequirementEnhance | IStoryEnhance | ITaskEnhance;
