import {
  GeneratedRequirementsSchema,
  PRDGeneratedRequirementsSchema,
} from "../common/schemas";
import { IRequirementType } from "../common/types";

export const getSchemaForGeneratedRequirements = (type: IRequirementType) => {
  const OutputSchema =
    type === "PRD"
      ? PRDGeneratedRequirementsSchema
      : GeneratedRequirementsSchema;

  return OutputSchema;
};
