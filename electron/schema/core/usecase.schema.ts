import { z } from "zod";

export interface ContextItem {
  type: string;
  source: string;
  summary?: string;
}

export interface ChatMessage {
  type: "user" | "assistant" | "tool";
  content: string;
  id?: string;
}

export interface UsecaseDraft {
  id: string;
  title: string;
  requirement: string;
  requirementAbbr: "SI";
  context: ContextItem[];
  chatHistory: ChatMessage[];
  status: "DRAFT" | "COMPLETE";
}

export const UsecaseDraftSchema = z.object({
  title: z.string(),
  requirement: z.string(),
  requirementAbbr: z.literal("SI"),
  context: z.array(z.object({
    type: z.string(),
    source: z.string(),
    summary: z.string().optional()
  })).default([]),
  chatHistory: z.array(z.object({
    type: z.enum(["user", "assistant", "tool"]),
    content: z.string(),
    id: z.string().optional()
  })).default([]),
  status: z.enum(["DRAFT", "COMPLETE"]).default("DRAFT")
});
