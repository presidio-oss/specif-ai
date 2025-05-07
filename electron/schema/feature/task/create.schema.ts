import { z } from 'zod';

export const createTaskSchema = z.object({
  appId: z.string(),
  appName: z.string(),
  appDescription: z.string(),
  reqId: z.string(),
  featureId: z.string(),
  name: z.string(),
  description: z.string(),
  regenerate: z.boolean(),
  technicalDetails: z.string(),
  extraContext: z.string().optional()
});

export type CreateTaskRequest = z.infer<typeof createTaskSchema>;

export interface CreateTaskResponse {
  appId: string;
  description: string;
  featureId: string;
  name: string;
  tasks: Array<{
    id: string;
    [key: string]: string;
  }>;
  regenerate: boolean;
  reqDesc: string;
  reqId: string;
}
