import { addBusinessProcessSchema, type AddBusinessProcessResponse } from '../../../schema/requirement/business-process/add.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { addBusinessProcessPrompt } from '../../../prompts/requirement/business-process/add';
import { repairJSON } from '../../../utils/custom-json-parser';
import { OPERATIONS, COMPONENT } from '../../../helper/constants';
import { traceBuilder } from '../../../utils/trace-builder';

export async function addBusinessProcess(event: IpcMainInvokeEvent, data: any): Promise<AddBusinessProcessResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[add-business-process] Using LLM config:', llmConfig);
    const validatedData = addBusinessProcessSchema.parse(data);

    const {
      name,
      description,
      reqt,
      selectedBRDs = [],
      selectedPRDs = []
    } = validatedData;

    if (!validatedData.useGenAI) {
      return {
        ...validatedData,
        LLMreqt: {
          title: validatedData.title || '',
          requirement: reqt || ''
        }
      };
    }

    // Generate prompt
    const prompt = addBusinessProcessPrompt({
      name,
      description,
      newReqt: reqt || '',
      BRDS: selectedBRDs.join('\n'),
      PRDS: selectedPRDs.join('\n')
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(COMPONENT.BP, OPERATIONS.ADD);
    const response = await handler.invoke(messages, null, traceName);
    console.log('[add-business-process] LLM Response:', response);

    // Parse LLM response
    const cleanedResponse = repairJSON(response);
    const llmResponse = JSON.parse(cleanedResponse);

    return {
      ...validatedData,
      LLMreqt: llmResponse.LLMreqt
    };
  } catch (error) {
    console.error('Error in addBusinessProcess:', error);
    throw error;
  }
}
