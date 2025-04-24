import { z } from "zod";
import { solutionIdSchema, businessProcessIdSchema } from "./solution.schema";
import { OPERATIONS } from "../helper/constants";

export enum DocumentType {
  BRD = "BRD",
  PRD = "PRD",
}

export type DocumentTypeValue = `${DocumentType}`;

const documentsArraySchema = {
  selectedBRDs: z.array(z.number()).default([]),
  selectedPRDs: z.array(z.number()).default([]),
};

const baseBPSchema = z.object({
  contentType: z.string(),
  id: z.string(),
  title: z.string().optional(),
  name: z.string(),
  description: z.string(),
  ...documentsArraySchema,
});

export const addBusinessProcessSchema = solutionIdSchema.extend({
  ...baseBPSchema.shape,
  reqt: z.string().optional(),
  addReqtType: z.string(),
});

export const updateBusinessProcessSchema = businessProcessIdSchema.extend({
  ...baseBPSchema.shape,
  updatedReqt: z.string().optional(),
  reqId: z.string(),
  reqDesc: z.string(),
});

export const flowchartSchema = businessProcessIdSchema.extend({
  title: z.string(),
  description: z.string(),
  ...documentsArraySchema,
});

const operationType = z.enum([OPERATIONS.ADD, OPERATIONS.UPDATE]);
export type OperationType = z.infer<typeof operationType>;

export const enhanceBusinessProcessSchema = z.object({
  solutionId: z.string(),
  type: operationType,
  name: z.string(),
  description: z.string(),
  reqt: z.string().optional(),
  reqDesc: z.string().optional(),
  updatedReqt: z.string().optional(),
  ...documentsArraySchema,
});

export interface BusinessProcessPromptData {
  name: string;
  description: string;
  reqt: string;
  reqDesc: string;
  updatedReqt: string;
  selectedBRDs: number[];
  selectedPRDs: number[];
}
