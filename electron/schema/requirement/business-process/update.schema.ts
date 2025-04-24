import { z } from 'zod';

export const updateBusinessProcessSchema = z.object({
  updatedReqt: z.string().optional(),
  contentType: z.string(),
  id: z.string(),
  title: z.string().optional(),
  reqId: z.string(),
  reqDesc: z.string(),
  name: z.string(),
  description: z.string(),
  useGenAI: z.boolean(),
  selectedBRDs: z.array(z.string()).optional(),
  selectedPRDs: z.array(z.string()).optional()
});

export type UpdateBusinessProcessRequest = z.infer<typeof updateBusinessProcessSchema>;

export interface UpdateBusinessProcessResponse extends UpdateBusinessProcessRequest {
  updated: {
    title: string;
    requirement: string;
  };
}