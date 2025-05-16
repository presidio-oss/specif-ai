import { bedrockConfigSchema } from '../helper/bedrock.options.schema';
import { z } from 'zod';

export const chatUpdateRequirementSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  requirement: z.string(),
  chatHistory: z.array(z.record(z.any())).optional(),
  knowledgeBase: z.string().optional(),
  bedrockConfig: bedrockConfigSchema.optional(), 
  userMessage: z.string(),
  requirementAbbr: z.enum(['BRD', 'PRD', 'UIR', 'NFR', 'BP']),
  brds: z.array(z.object({
    id: z.string(),
    title: z.string(),
    requirement: z.string()
  })).optional()
});

export type ChatUpdateRequirementRequest = z.infer<typeof chatUpdateRequirementSchema>;

export interface ChatUpdateRequirementResponse {
  response: string;
  blocked?: boolean;
  blockedReason?: string;
}
