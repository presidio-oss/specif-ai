import { z } from "zod";
import { solutionIdSchema, businessProcessIdSchema } from "./solution.schema";

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
  name: z.string(),
  description: z.string(),
  ...documentsArraySchema.shape,
});

export const addBusinessProcessSchema = solutionIdSchema.extend({
  ...baseBPSchema.shape,
});

export const updateBusinessProcessSchema = businessProcessIdSchema.extend({
  ...baseBPSchema.shape,
});

export const flowchartSchema = businessProcessIdSchema.extend({
  title: z.string(),
  description: z.string(),
  ...documentsArraySchema.shape,
});
