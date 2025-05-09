import { z } from 'zod';

export const bedrockConfigSchema = z.object({
  region: z.string(),
  accessKey: z.string(),
  secretKey: z.string(),
  sessionKey: z.string().optional()
});

export type BedrockConfig = z.infer<typeof bedrockConfigSchema>;