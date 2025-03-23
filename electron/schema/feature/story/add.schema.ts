import { z } from 'zod';

export const addUserStorySchema = z.object({
    name: z.string().min(1, "App Name must not be empty"),
    description: z.string().min(1, "App Description must not be empty"),
    reqId: z.string().min(1, "Product requirement Id must not be empty"),
    reqDesc: z.string().min(1, "Product requirement must not be empty"),
    featureId: z.string().min(1, "Feature id must not be empty"),
    featureRequest: z.string().min(1, "Feature request must not be empty"),
    contentType: z.string(),
    fileContent: z.string(),
    useGenAI: z.boolean()
});

export type AddUserStoryRequest = z.infer<typeof addUserStorySchema>;

export interface AddUserStoryResponse extends AddUserStoryRequest {
    features: Array<{
        id: string;
        [key: string]: string;
    }>;
}
