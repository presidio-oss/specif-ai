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

export const verifyConfigSchema = z.object({
  provider: z.string(),
  model: z.string().optional(),
  config: z.record(z.unknown()).optional()
});

export type VerifyConfigRequest = z.infer<typeof verifyConfigSchema>;

export interface VerifyConfigResponse {
  status: 'success' | 'failed';
  message: string;
  provider: string;
  model: string;
  testResponse?: string;
}
