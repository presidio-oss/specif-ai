import { z } from 'zod';

export const ProviderConfigSchema = z.object({
  config: z.object({
    apiKey: z.string().optional(),
    endpoint: z.string().optional(),
    deployment: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    sessionToken: z.string().optional(),
    region: z.string().optional(),
    crossRegion: z.boolean().optional(),
    baseUrl: z.string().optional(),
    maxRetries: z.number().optional(),
    model: z.string().optional(),
  }).passthrough()
});

export const LLMConfigSchema = z.object({
  activeProvider: z.string(),
  providerConfigs: z.record(ProviderConfigSchema),
  isDefault: z.boolean()
});

export type LLMConfigSchemaType = z.infer<typeof LLMConfigSchema>;
export type ProviderConfigSchemaType = z.infer<typeof ProviderConfigSchema>;