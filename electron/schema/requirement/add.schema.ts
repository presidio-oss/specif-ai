import { z } from 'zod';

export const addRequirementSchema = z.object({
    reqt: z.string().optional(),
    fileContent: z.string().optional(),
    contentType: z.string(),
    id: z.string(),
    title: z.string(),
    addReqtType: z.enum(['BRD', 'PRD', 'UIR', 'NFR']),
    name: z.string(),
    description: z.string(),
    useGenAI: z.boolean()
});

export type AddRequirementRequest = z.infer<typeof addRequirementSchema>;

export interface AddRequirementResponse extends AddRequirementRequest {
    LLMreqt: {
        requirement: string;
        title: string;
    };
}
