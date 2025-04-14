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
