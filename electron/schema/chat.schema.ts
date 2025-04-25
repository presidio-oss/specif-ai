import { z } from "zod";
import { bedrockConfigSchema } from "./helper/bedrock.options.schema";
import { solutionIdSchema } from "./solution.schema";
import { CHAT_INTENT, USER_TYPE } from "../helper/constants";

/**
 * Common schema for BRD entries.
 */
const brdItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  requirement: z.string(),
});

/**
 * Shared chat input structure
 */
const chatBaseSchema = {
  name: z.string(),
  description: z.string(),
  type: z.string(),
  requirement: z.string(),
  chatHistory: z.array(
    z.object({
      role: z.enum([USER_TYPE.USER, USER_TYPE.ASSISTANT]),
      content: z.string(),
    })
  ),
  knowledgeBase: z.string().optional(),
  bedrockConfig: bedrockConfigSchema.optional(),
  userMessage: z.string(),
  solutionId: z.number(),
  documentId: z.number(),
};

/**
 * Chat: Requirement Update Schema
 */
export const chatRequirementUpdateSchema = z.object({
  chatIntent: z.literal(CHAT_INTENT.REQUIREMENT_UPDATE),
  ...chatBaseSchema,
  requirementAbbr: z.enum(["BRD", "PRD", "UIR", "NFR", "BP"]),
  brds: z.array(brdItemSchema).optional(),
});

/**
 * Chat: Story/Task Update Schema
 */
export const chatStoryTaskUpdateSchema = z.object({
  chatIntent: z.literal(CHAT_INTENT.STORY_TASK_UPDATE),
  ...chatBaseSchema,
  prd: z.string().optional(),
  us: z.string().optional(),
});

/**
 * Chat: Suggestion Schema
 */
export const chatSuggestionSchema = z.object({
  chatIntent: z.literal(CHAT_INTENT.SUGGESTION_GENERATION),
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  requirementAbbr: z.string(),
  requirement: z.string(),
  suggestions: z.array(z.string()),
  selectedSuggestion: z.string().optional(),
  knowledgeBase: z.string().optional(),
  bedrockConfig: bedrockConfigSchema.optional(),
  brds: z.array(brdItemSchema).default([]),
});

/**
 * Chat: Get History Schema
 */

export const getChatHistorySchema = solutionIdSchema.extend({
  documentId: z.number(),
});
