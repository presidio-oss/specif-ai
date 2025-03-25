import { z } from 'zod';

export const updateRequirementSchema = z.object({
  name: z.string(),
  description: z.string(),
  reqDesc: z.string(),
  reqId: z.string(),
  title: z.string().optional(),
  updatedReqt: z.string(),
  addReqtType: z.enum(['BRD', 'PRD', 'UIR', 'NFR', 'BP']),
  fileContent: z.string().optional(),
  contentType: z.string(),
  id: z.string(),
  useGenAI: z.boolean()
});

export type UpdateRequirementRequest = z.infer<typeof updateRequirementSchema>;

export interface UpdatedRequirement {
  title: string;
  requirement: string;
}

export interface UpdateRequirementResponse extends UpdateRequirementRequest {
  updated: UpdatedRequirement;
}
