import { z } from 'zod';

export const verifyLangfuseConfigSchema = z.object({
  publicKey: z.string(),
  secretKey: z.string(),
  baseUrl: z.string().optional(),
  enableDetailedTraces: z.boolean().optional()
});

export type VerifyLangfuseConfigRequest = z.infer<typeof verifyLangfuseConfigSchema>;

export interface VerifyLangfuseConfigResponse {
  status: 'success' | 'failed';
  message: string;
}

export interface LangfuseConfigStore {
  langfuseConfig: {
    useCustomConfig: boolean;
    config: {
      publicKey: string;
      secretKey: string;
      baseUrl?: string;
    } | null;
  }
}

export const LANGFUSE_CONFIG_STORE_KEY = 'LANGFUSE_CONFIG';
