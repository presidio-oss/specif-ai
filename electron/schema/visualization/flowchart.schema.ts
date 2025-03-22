import { z } from 'zod';

export const flowchartSchema = z.object({
  title: z.string(),
  description: z.string(),
  selectedBRDs: z.array(z.string()),
  selectedPRDs: z.array(z.string())
});

export type FlowchartRequest = z.infer<typeof flowchartSchema>;

export interface FlowchartResponse {
  flowChartData: string;
}
