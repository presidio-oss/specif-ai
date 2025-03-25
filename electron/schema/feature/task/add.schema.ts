import { z } from 'zod';

export const addTaskSchema = z.object({
  name: z.string(),
  description: z.string(),
  appId: z.string(),
  featureId: z.string(),
  taskId: z.string(),
  contentType: z.string(),
  fileContent: z.string(),
  reqId: z.string(),
  taskName: z.string(),
  reqDesc: z.string(),
  useGenAI: z.boolean(),
  usIndex: z.number()
});

export type AddTaskRequest = z.infer<typeof addTaskSchema>;

export interface AddTaskResponse {
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
