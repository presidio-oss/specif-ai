import z from "zod";

export const GeneratedRequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  requirement: z.string(),
});

export const GeneratedRequirementsSchema = z.array(GeneratedRequirementSchema);

export const PRDGeneratedRequirementsSchema = z.array(
  GeneratedRequirementSchema.extend({
    linkedBRDIds: z.array(z.string()),
  })
);

export type IGeneratedRequirementItem = z.infer<
  typeof GeneratedRequirementSchema
>;
export type IGeneratedRequirements = z.infer<
  typeof GeneratedRequirementsSchema
>;

export type IPRDRequirements = z.infer<typeof PRDGeneratedRequirementsSchema>;
export type IPRDRequirementItem = IPRDRequirements[number];

export const GenerateUserStoriesSchema = z.object({
  solutionId: z.number(),
  prdId: z.number(),
  technicalDetails: z.string(),
  requirementTitle: z.string(),
  requirementDescription: z.string(),
  extraContext: z.string().optional(),
  regenerate: z.boolean().default(false),
  oldUserStoriesIds: z.array(z.number()).default([]),
})

export type IGenerateUserStoriesRequest = z.infer<typeof GenerateUserStoriesSchema>

export const GenerateTasksSchema = z.object({
  solutionId: z.number(),
  storyId: z.number(),
  technicalDetails: z.string(),
  requirementTitle: z.string(),
  requirementDescription: z.string(),
  extraContext: z.string().optional(),
  regenerate: z.boolean().default(false),
  oldTasksIds: z.array(z.number()).default([]),
})

export type IGenerateTasksRequest = z.infer<typeof GenerateTasksSchema>