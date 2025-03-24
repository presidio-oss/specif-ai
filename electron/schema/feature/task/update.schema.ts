import { z } from 'zod';

export const updateTaskSchema = z.object({
  name: z.string(),
  description: z.string(),
  appId: z.string(),
  featureId: z.string(),
  taskId: z.string(),
  contentType: z.string(),
  fileContent: z.string(),
  reqId: z.string(),
  reqDesc: z.string(),
  useGenAI: z.boolean(),
  usIndex: z.number(),
  existingTaskTitle: z.string(),
  existingTaskDesc: z.string(),
  taskName: z.string()
});

export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>;

export interface UpdateTaskResponse {
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
