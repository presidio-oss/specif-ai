import { z } from 'zod';

export const appConfigSchema = z.object({
  posthogKey: z.string().describe('PostHog API key'),
  posthogHost: z.string().describe('PostHog host URL'),
  posthogEnabled: z.boolean().describe('PostHog analytics enabled flag'),
  langfuseEnabled: z.boolean().describe('Observability enabled flag')
});

export type AppConfigResponse = z.infer<typeof appConfigSchema>;
