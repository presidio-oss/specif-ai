import { z } from "zod";
import { solutionIdSchema, businessProcessIdSchema } from "./solution.schema";

const baseBPFields = {
  contentType: z.string(),
  id: z.string(),
  title: z.string().optional(),
  name: z.string(),
  description: z.string(),
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

export const updateBusinessProcessSchema = businessProcessIdSchema.extend({
  ...baseBPFields,
  updatedReqt: z.string().optional(),
  reqId: z.string(),
  reqDesc: z.string(),
});

export type UpdateBusinessProcessRequest = z.infer<
  typeof updateBusinessProcessSchema
>;

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

export const enhanceBusinessProcessSchema = z.object({
  solutionId: z.string(),
  type: z.enum(["add", "update"]),
  name: z.string(),
  description: z.string(),
  reqt: z.string().optional(),
  reqDesc: z.string().optional(),
  updatedReqt: z.string().optional(),
  selectedBRDs: z.array(z.number()).default([]),
  selectedPRDs: z.array(z.number()).default([]),
});

export type EnhanceBusinessProcessRequest = z.infer<
  typeof enhanceBusinessProcessSchema
>;

export interface BusinessProcessEnhanceResult {
  title: string;
  requirement: string;
}

export interface EnhanceBusinessProcessResponse {
  type: "add" | "update";
  result: BusinessProcessEnhanceResult;
}

export enum DocumentType {
  BRD = "BRD",
  PRD = "PRD",
}

export type DocumentTypeValue = `${DocumentType}`;
