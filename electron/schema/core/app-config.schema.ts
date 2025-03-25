import { z } from 'zod';

export const appConfigSchema = z.object({
  key: z.string().describe('PostHog API key'),
  host: z.string().describe('PostHog host URL')
});

export type AppConfigResponse = z.infer<typeof appConfigSchema>;
