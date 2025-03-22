import { updateBusinessProcessSchema, type UpdateBusinessProcessResponse } from '../../../schema/requirement/business-process/update.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { updateBusinessProcessPrompt } from '../../../prompts/requirement/business-process/update';

export async function updateBusinessProcess(event: IpcMainInvokeEvent, data: any): Promise<UpdateBusinessProcessResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-business-process] Using LLM config:', llmConfig);
    const validatedData = updateBusinessProcessSchema.parse(data);

    const {
      name,
      description,
      updatedReqt,
      reqDesc,
      selectedBRDs = [],
      selectedPRDs = []
    } = validatedData;

    if (!validatedData.useGenAI) {
      return {
        ...validatedData,
        updated: {
          title: validatedData.title || '',
          requirement: updatedReqt || ''
        }
      };
    }

    // Generate prompt
    const prompt = updateBusinessProcessPrompt({
      name,
      description,
      existingReqt: reqDesc,
      updatedReqt: updatedReqt || '',
      BRDS: selectedBRDs.join('\n'),
      PRDS: selectedPRDs.join('\n')
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages);
    console.log('[update-business-process] LLM Response:', response);

    // Parse LLM response
    const llmResponse = JSON.parse(response);

    return {
      ...validatedData,
      updated: llmResponse.updated
    };
  } catch (error) {
    console.error('Error in updateBusinessProcess:', error);
    throw error;
  }
}
