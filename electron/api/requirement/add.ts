import {
  addRequirementSchema,
  type AddRequirementResponse,
} from "../../schema/requirement/add.schema";
import { LLMUtils } from "../../services/llm/llm-utils";
import { buildLLMHandler } from "../../services/llm";
import { store } from "../../services/store";
import { RequirementRepository } from "../../repo/requirement.repo";
import type { IpcMainInvokeEvent } from "electron";
import type { LLMConfigModel } from "../../services/llm/llm-types";
import { addRequirementPrompt } from "../../prompts/requirement/add";
import { repairJSON } from "../../utils/custom-json-parser";
import { traceBuilder } from "../../utils/trace-builder";
import { OPERATIONS } from "../../helper/constants";

export async function addRequirement(
  event: IpcMainInvokeEvent,
  data: unknown
): Promise<AddRequirementResponse> {
  try {
    const validatedData = addRequirementSchema.parse(data);
    const {
      name,
      description,
      reqt,
      fileContent,
      addReqtType,
      useGenAI,
      brds,
      title,
    } = validatedData;
    
    console.log("[add-requirement] Adding requirement...");
    const reqRepository = new RequirementRepository();
    let requirementTitle = title;
    let requirementContent = reqt || '';
    
    // Generate requirement with AI if requested
    if (useGenAI) {
      const llmConfig = store.getLLMConfig();
      if (!llmConfig) {
        throw new Error("LLM configuration not found");
      }
      
      console.log("[add-requirement] Using LLM config:", llmConfig);
      
      // Generate prompt and prepare messages
      const prompt = addRequirementPrompt({
        name,
        description,
        newReqt: reqt || "",
        fileContent,
        addReqtType,
        brds,
      });
      
      const messages = await LLMUtils.prepareMessages(prompt);
      const handler = buildLLMHandler(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      );
      
      const traceName = traceBuilder(addReqtType, OPERATIONS.ADD);
      const response = await handler.invoke(messages, null, traceName);
      console.log("[add-requirement] LLM Response:", response);
      
      try {
        const cleanedResponse = repairJSON(response);
        const parsed = JSON.parse(cleanedResponse);
        
        if (!parsed.LLMreqt?.title || !parsed.LLMreqt?.requirement) {
          throw new Error("Invalid response structure");
        }
        
        requirementTitle = parsed.LLMreqt.title;
        requirementContent = parsed.LLMreqt.requirement;
      } catch (error) {
        console.error("[add-requirement] Error parsing LLM response:", error);
        throw new Error("Failed to parse LLM response as JSON");
      }
    }
    
    // Save requirement to database (whether AI-generated or user-provided)
    await reqRepository.saveRequirement({
      title: requirementTitle,
      requirement: requirementContent,
      documentTypeId: addReqtType,
    });
    
    return {
      ...validatedData,
      LLMreqt: {
        title: requirementTitle,
        requirement: requirementContent,
      },
    };
  } catch (error) {
    console.error("Error in addRequirement:", error);
    throw error;
  }
}