import { z } from "zod";
import { bedrockConfigSchema } from "../helper/bedrock.options.schema";

export const brdSchema = z.object({
  id: z.string(),
  title: z.string(),
  requirement: z.string(),
});

export const getSuggestionsSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    type: z.string(),
    requirementAbbr: z.string(),
    requirement: z.string(),
    suggestions: z.array(z.string()),
    selectedSuggestion: z.string().optional(),
    knowledgeBase: z.string().optional(),
    bedrockConfig: bedrockConfigSchema.optional(),
    brds: z.array(brdSchema).default([]),
});

export type GetSuggestionsRequest = z.infer<typeof getSuggestionsSchema>;
export type BrdSchema = z.infer<typeof brdSchema>;
