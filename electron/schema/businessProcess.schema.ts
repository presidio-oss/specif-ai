import { z } from "zod";
import { solutionIdSchema, businessProcessIdSchema } from "./solution.schema";

const baseBPFields = {
  contentType: z.string(),
  id: z.string(),
  title: z.string().optional(),
  name: z.string(),
  description: z.string(),
  useGenAI: z.boolean(),
  selectedBRDs: z.array(z.number()).default([]),
  selectedPRDs: z.array(z.number()).default([]),
};

export const addBusinessProcessSchema = solutionIdSchema.extend({
  ...baseBPFields,
  reqt: z.string().optional(),
  addReqtType: z.string(),
});

export type AddBusinessProcessRequest = z.infer<
  typeof addBusinessProcessSchema
>;

export interface AddBusinessProcessResponse extends AddBusinessProcessRequest {
  LLMreqt: {
    title: string;
    requirement: string;
  };
}

export const updateBusinessProcessSchema = businessProcessIdSchema.extend({
  ...baseBPFields,
  updatedReqt: z.string().optional(),
  reqId: z.string(),
  reqDesc: z.string(),
});

export type UpdateBusinessProcessRequest = z.infer<
  typeof updateBusinessProcessSchema
>;

export interface UpdateBusinessProcessResponse
  extends UpdateBusinessProcessRequest {
  updated: {
    title: string;
    requirement: string;
  };
}

export const flowchartSchema = businessProcessIdSchema.extend({
  title: z.string(),
  description: z.string(),
  selectedBRDs: z.array(z.number()).default([]),
  selectedPRDs: z.array(z.number()).default([]),
});

export type FlowchartRequest = z.infer<typeof flowchartSchema>;

export interface FlowchartResponse {
  flowChartData: string;
}
