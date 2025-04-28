import { z } from "zod";
import { solutionIdSchema, businessProcessIdSchema } from "./solution.schema";
import { OPERATIONS } from "../helper/constants";

export enum DocumentType {
  BRD = "BRD",
  PRD = "PRD",
}

export type DocumentTypeValue = `${DocumentType}`;

export const documentsArraySchema = z.object({
  selectedBRDs: z.array(z.number()).default([]),
  selectedPRDs: z.array(z.number()).default([]),
});

export type DocumentsArray = z.infer<typeof documentsArraySchema>;

const baseBPSchema = z.object({
  contentType: z.string(),
  id: z.string(),
  title: z.string().optional(),
  name: z.string(),
  description: z.string(),
  ...documentsArraySchema.shape,
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
  ...documentsArraySchema.shape,
});
