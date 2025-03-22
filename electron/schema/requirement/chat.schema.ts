import { z } from 'zod';

export const chatUpdateRequirementSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  requirement: z.string(),
  chatHistory: z.array(z.record(z.any())).optional(),
  knowledgeBase: z.string().optional(),
  userMessage: z.string(),
  requirementAbbr: z.enum(['BRD', 'PRD', 'UIR', 'NFR'])
});

export type ChatUpdateRequirementRequest = z.infer<typeof chatUpdateRequirementSchema>;

export interface ChatUpdateRequirementResponse {
  response: string;
}
