import { McpSettingsSchema } from '../../mcp/schema';
import { z } from 'zod';

export const generationRangeSchema = z.object({
  maxCount: z.number(),
  isEnabled: z.boolean()
});

export const createSolutionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().min(1),
  frontend: z.boolean().optional(),
  backend: z.boolean().optional(),
  database: z.boolean().optional(),
  deployment: z.boolean().optional(),
  createReqt: z.boolean().optional(),
  cleanSolution: z.boolean(),
  brdPreferences: generationRangeSchema,
  prdPreferences: generationRangeSchema,
  uirPreferences: generationRangeSchema,
  nfrPreferences: generationRangeSchema,
  mcpSettings: McpSettingsSchema
});

export type CreateSolutionRequest = z.infer<typeof createSolutionSchema>;

export type SolutionResponse = {
  brd?: Array<{ id: string; title: string; requirement: string }>;
  nfr?: Array<{ id: string; title: string; requirement: string }>;
  prd?: Array<{ id: string; title: string; requirement: string }>;
  uir?: Array<{ id: string; title: string; requirement: string }>;
  createReqt: boolean;
  description: string;
  name: string;
};
