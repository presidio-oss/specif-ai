import { z } from 'zod';

export const getSuggestionsSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.string(),
  requirement: z.string(),
  suggestions: z.array(z.string()),
  selectedSuggestion: z.string().optional(),
  knowledgeBase: z.string().optional()
});

export type GetSuggestionsRequest = z.infer<typeof getSuggestionsSchema>;
