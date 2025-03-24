import { z } from 'zod';

export const validateBedrockSchema = z.object({
  kbId: z.string(),
  accessKeyId: z.string(),
  secretKey: z.string(),
  region: z.string(),
  sessionKey: z.string().optional()
});

export type ValidateBedrockRequest = z.infer<typeof validateBedrockSchema>;

export interface ValidateBedrockResponse {
  isValid: boolean;
}
