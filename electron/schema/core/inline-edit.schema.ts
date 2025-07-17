import { z } from "zod";

/**
 * Schema for inline edit payload
 */
export const InlineEditPayloadSchema = z.object({
  requestId: z.string(),
  selectedText: z.string(),
  userPrompt: z.string(),
  context: z.string().optional(),
  preserveFormatting: z.boolean().optional()
});

/**
 * Schema for inline edit response
 */
export const InlineEditResponseSchema = z.object({
  requestId: z.string(),
  editedText: z.string(),
  success: z.boolean(),
  error: z.string().optional()
});

/**
 * TypeScript interface for inline edit payload
 */
export type InlineEditPayload = z.infer<typeof InlineEditPayloadSchema>;

/**
 * TypeScript interface for inline edit response
 */
export type InlineEditResponse = z.infer<typeof InlineEditResponseSchema>;
