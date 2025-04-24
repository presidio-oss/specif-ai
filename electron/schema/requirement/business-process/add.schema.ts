import { z } from 'zod';

export const addBusinessProcessSchema = z.object({
  reqt: z.string().optional(),
  contentType: z.string(),
  id: z.string(),
  title: z.string().optional(),
  addReqtType: z.string(),
  name: z.string(),
  description: z.string(),
  useGenAI: z.boolean(),
  selectedBRDs: z.array(z.string()).optional(),
  selectedPRDs: z.array(z.string()).optional(),
  solutionId: z.number()
});

export type AddBusinessProcessRequest = z.infer<typeof addBusinessProcessSchema>;

export interface AddBusinessProcessResponse extends AddBusinessProcessRequest {
  LLMreqt: {
    title: string;
    requirement: string;
  };
}
