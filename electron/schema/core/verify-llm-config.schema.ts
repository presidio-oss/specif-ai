import { z } from 'zod';

export const verifyConfigSchema = z.object({
  provider: z.string(),
  model: z.string().optional(),
  config: z.record(z.unknown()).optional()
});

export type VerifyConfigRequest = z.infer<typeof verifyConfigSchema>;

export interface VerifyConfigResponse {
  status: 'success' | 'failed';
  message: string;
  provider: string;
  model: string;
  testResponse?: string;
}
