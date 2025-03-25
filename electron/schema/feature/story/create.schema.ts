import { z } from 'zod';

export const createStorySchema = z.object({
  reqDesc: z.string(),
  extraContext: z.string().optional(),
  technicalDetails: z.string().optional()
});

export type CreateStoryRequest = z.infer<typeof createStorySchema>;

export interface CreateStoryResponse {
  features: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
