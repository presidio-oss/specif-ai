import { addRequirementSchema, type AddRequirementResponse } from '../../schema/requirement/add.schema';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { addRequirementPrompt } from '../../prompts/requirement/add';
import { repairJSON } from '../../utils/custom-json-parser';

export async function addRequirement(event: IpcMainInvokeEvent, data: unknown): Promise<AddRequirementResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[add-requirement] Using LLM config:', llmConfig);
    const validatedData = addRequirementSchema.parse(data);

    const {
      name,
      description,
      reqt,
      fileContent,
      addReqtType,
      useGenAI,
      brds
    } = validatedData;

    if (!useGenAI && !fileContent) {
      return {
        ...validatedData,
        LLMreqt: {
          title: validatedData.title,
          requirement: reqt || ''
        }
      };
    }

    // Generate prompt
    const prompt = addRequirementPrompt({
      name,
      description,
      newReqt: reqt || '',
      fileContent,
      addReqtType,
      brds
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages);
    console.log('[add-requirement] LLM Response:', response);

    let result;
    try {
      let cleanedResponse = repairJSON(response);
      const parsed = JSON.parse(cleanedResponse);
      if (!parsed.LLMreqt || !parsed.LLMreqt.title || !parsed.LLMreqt.requirement) {
        throw new Error('Invalid response structure');
      }
      result = parsed;
    } catch (error) {
      console.error('[add-requirement] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return {
      ...validatedData,
      LLMreqt: result.LLMreqt
    };
  } catch (error) {
    console.error('Error in addRequirement:', error);
    throw error;
  }
}
