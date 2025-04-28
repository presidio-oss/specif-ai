import { DbDocumentType, PromptMode } from "../helper/constants";
import { z } from "zod";
import { documentsArraySchema } from "./businessProcess.schema";
import { solutionIdSchema } from "./solution.schema";

const DbDocumentTypeSchema = z.nativeEnum(DbDocumentType);
const PromptModeSchema = z.nativeEnum(PromptMode);

/**
 * Base interface for document enhancement data
 * @property {Object} documentData - Core document information
 * @property {string} [documentData.name] - Optional name of the document
 * @property {string} [documentData.description] - Optional description of the document
 * @property {string} [documentData.id] - Optional document identifier
 * @property {string} [documentData.jiraId] - Optional JIRA issue identifier
 * @property {DbDocumentType} documentData.documentTypeId - Type of the document (BRD, PRD, STORY, TASK)
 * @property {string} [solutionName] - Optional name of the solution
 * @property {string} [solutionDescription] - Optional description of the solution
 * @property {string} [fileContent] - Optional content of the associated file
 * @property {PromptMode} mode - Mode of operation (CREATE, ENHANCE, REVIEW)
 */
export const documentEnhanceBaseSchema = z.object({
    documentData: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        id: z.string().optional(),
        jiraId: z.string().optional(),
        documentTypeId: DbDocumentTypeSchema,
    }),
    solutionName: z.string().optional(),
    solutionDescription: z.string().optional(),
    fileContent: z.string().optional(),
    mode: PromptModeSchema,
})

export type IDocumentEnhance = z.infer<typeof documentEnhanceBaseSchema>;

/**
 * Requirements document enhancement (Can be applicable for BRD, PRD, NFR or UIR)
 * @property {Array<{title: string, requirement: string}>} [linkedDocuments] - Optional array of linked documents with their requirements
 */
export const requirementEnhanceSchema = documentEnhanceBaseSchema.extend({
    linkedDocuments: z.array(z.object({
        title: z.string(),
        requirement: z.string(),
    })).default([]),
})

export type IRequirementEnhance = z.infer<typeof requirementEnhanceSchema>;

/**
 * Story document enhancement (Used for enhancing a user story)
 * @property {string} prdName - Name of the associated PRD document
 * @property {string} prdDescription - Description of the associated PRD document
 * @property {string} [newStoryDescription] - Optional updated story description
 */
export const storyEnhanceSchema = documentEnhanceBaseSchema.extend({
    prdName: z.string(),
    prdDescription: z.string(),
    newStoryDescription: z.string().optional(),
})

export type IStoryEnhance = z.infer<typeof storyEnhanceSchema>;

/**
 * Task document enhancement (Used for enhancing a task)
 * @property {string} storyName - Name of the associated story
 * @property {string} storyDescription - Description of the associated story
 * @property {string} [newTaskDescription] - Optional updated task description
 */
export const taskEnhanceSchema = documentEnhanceBaseSchema.extend({
    storyName: z.string(),
    storyDescription: z.string(),
    newTaskDescription: z.string().optional(),
})

export type ITaskEnhance = z.infer<typeof taskEnhanceSchema>;

/**
 * Business Process document enhancement
 * @property {string} solutionId - ID of the associated solution
 * @property {string} [newBpDescription] - Optional updated Bp description
 */
export const businessProcessEnhanceSchema = documentEnhanceBaseSchema.extend({
  newBpDescription: z.string().optional(),
  solutionId: solutionIdSchema.shape.solutionId,
  ...documentsArraySchema.shape,
});

export type IBusinessProcessEnhancePrompt = Omit<
  z.infer<typeof businessProcessEnhanceSchema>,
  "selectedBRDs" | "selectedPRDs"
> & {
  selectedBRDs?: string;
  selectedPRDs?: string;
};

export type IBusinessProcessEnhance = z.infer<typeof businessProcessEnhanceSchema>;


/**
 * Union type for all document enhancement types
 */
export const llmEnhanceSchema = z.union([
  requirementEnhanceSchema,
  storyEnhanceSchema,
  taskEnhanceSchema,
  businessProcessEnhanceSchema,
]);
export type ILLMEnhance =
  | IRequirementEnhance
  | IStoryEnhance
  | ITaskEnhance
  | IBusinessProcessEnhancePrompt;
