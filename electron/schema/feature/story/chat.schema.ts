import { z } from 'zod';

export const chatUserStoryTaskSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.string(),
  requirement: z.string(),
  chatHistory: z.array(z.record(z.any())).optional(),
  knowledgeBase: z.string().optional(),
  userMessage: z.string(),
  prd: z.string(),
  us: z.string().optional()
});

export type ChatUserStoryTaskRequest = z.infer<typeof chatUserStoryTaskSchema>;

export interface ChatUserStoryTaskResponse {
  response: string;
}
