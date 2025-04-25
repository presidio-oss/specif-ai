import { z } from 'zod';

export const createStorySchema = z.object({
  solutionId: z.number(),
  prdId: z.number(),
  reqDesc: z.string(),
  extraContext: z.string().optional(),
  technicalDetails: z.string().optional(),
});

export type CreateStoryRequest = z.infer<typeof createStorySchema>;

export interface CreateStoryResponse {
  features: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
