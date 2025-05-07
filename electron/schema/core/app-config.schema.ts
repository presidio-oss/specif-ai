import { z } from 'zod';

export const appConfigSchema = z.object({
  key: z.string().describe('PostHog API key'),
  host: z.string().describe('PostHog host URL'),
  enabled: z.boolean().describe('PostHog analytics enabled flag'),
  observabilityEnabled: z.boolean().describe('Observability enabled flag')
});

export type AppConfigResponse = z.infer<typeof appConfigSchema>;
