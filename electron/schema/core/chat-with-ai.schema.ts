import { z } from "zod";

const RequirementItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  requirement: z.string(),
});

const ChatContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const UserMessageSchema = z.object({
  id: z.string().optional(),
  type: z.literal("user"),
  content: z.array(ChatContentSchema),
});

const ToolMessageSchema = z.object({
  id: z.string().optional(),
  type: z.literal("tool"),
  content: z.string().optional(),
  tool_call_id: z.string(),
  name: z.string(),
});

const AssistantMessageSchema = z.object({
  id: z.string().optional(),
  type: z.literal("assistant"),
  content: z.array(ChatContentSchema),
  toolCalls: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      args: z.record(z.any()).default({}),
    })
  ),
});

const BaseParamsSchema = z.object({
  requestId: z.string(),
  project: z.object({
    name: z.string(),
    description: z.string(),
  }),
  chatHistory: z
    .array(
      z.union([UserMessageSchema, AssistantMessageSchema, ToolMessageSchema])
    )
    .optional(),
  recursionLimit: z.number().optional(),
  requirement: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

const PRDParamsSchema = BaseParamsSchema.extend({
  requirementAbbr: z.literal("PRD"),
  brds: z.array(RequirementItemSchema).optional(),
});

const NFRParamsSchema = BaseParamsSchema.extend({
  requirementAbbr: z.literal("NFR"),
});

const UIRParamsSchema = BaseParamsSchema.extend({
  requirementAbbr: z.literal("UIR"),
});

const BRDParamsSchema = BaseParamsSchema.extend({
  requirementAbbr: z.literal("BRD"),
});

const BPParamsSchema = BaseParamsSchema.extend({
  requirementAbbr: z.literal("BP"),
  brds: z.array(z.string()).optional(),
  prds: z.array(z.string()).optional(),
});

const USParamsSchema = BaseParamsSchema.extend({
  requirementAbbr: z.literal("US"),
  prd: z.string().optional(),
});

const TaskParamsSchema = BaseParamsSchema.extend({
  requirementAbbr: z.literal("TASK"),
  userStory: z.string().optional(),
  prd: z.string().optional(),
});

export const ChatWithAISchema = z.discriminatedUnion("requirementAbbr", [
  PRDParamsSchema,
  NFRParamsSchema,
  UIRParamsSchema,
  BRDParamsSchema,
  BPParamsSchema,
  USParamsSchema,
  TaskParamsSchema,
]);

export type ChatWithAIParams = z.infer<typeof ChatWithAISchema>;
