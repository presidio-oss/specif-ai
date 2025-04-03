import { updateRequirementSchema, type UpdateRequirementResponse } from '../../schema/requirement/update.schema';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { updateRequirementPrompt } from '../../prompts/requirement/update';
import { repairJSON } from '../../utils/custom-json-parser';

export async function updateRequirement(event: IpcMainInvokeEvent, data: unknown): Promise<UpdateRequirementResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-requirement] Using LLM config:', llmConfig);
    const validatedData = updateRequirementSchema.parse(data);

    const {
      name,
      description,
      reqDesc,
      reqId,
      updatedReqt,
      addReqtType,
      fileContent,
      useGenAI,
      brds
    } = validatedData;

    // If useGenAI is false and no file content provided, return direct update
    if (!useGenAI && !fileContent) {
      return {
        ...validatedData,
        updated: {
          title: validatedData.title || 'Updated Requirement',
          requirement: `${updatedReqt} ${reqDesc}`
        }
      };
    }

    // Generate prompt
    const prompt = updateRequirementPrompt({
      name,
      description,
      existingReqt: reqDesc,
      updatedReqt,
      fileContent,
      reqId,
      addReqtType,
      brds
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages, null, "requirement:update");
    console.log('[update-requirement] LLM Response:', response);

    let result;
    try {
      let cleanedResponse = repairJSON(response);
      const parsed = JSON.parse(cleanedResponse);
      if (!parsed.updated || !parsed.updated.title || !parsed.updated.requirement) {
        throw new Error('Invalid response structure');
      }
      result = parsed;
    } catch (error) {
      console.error('[update-requirement] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return {
      ...validatedData,
      updated: result.updated
    };
  } catch (error) {
    console.error('Error in updateRequirement:', error);
    throw error;
  }
}
