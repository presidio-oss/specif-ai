import { updateBusinessProcessSchema, type UpdateBusinessProcessResponse } from '../../../schema/requirement/business-process/update.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { updateBusinessProcessPrompt } from '../../../prompts/requirement/business-process/update';
import { repairJSON } from '../../../utils/custom-json-parser';
import { COMPONENT, OPERATIONS, DbDocumentType, PromptMode } from '../../../helper/constants';
import { traceBuilder } from '../../../utils/trace-builder';

export async function updateBusinessProcess(event: IpcMainInvokeEvent, data: any): Promise<UpdateBusinessProcessResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-business-process] Using LLM config:', llmConfig);
    const validatedData = updateBusinessProcessSchema.parse(data);

    const {
      name = "Sample Business Process",
      description = "Sample business process description",
      updatedReqt = "Sample updated requirement text",
      reqDesc = "Sample existing requirement description",
      selectedBRDs = [1, 2],
      selectedPRDs = [1, 2]
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
    // TODO: These are currently having placeholders to avoid build errors - since we'll be deprecating this api layer
    const prompt = updateBusinessProcessPrompt({
      solutionId: 1,
      solutionName: name,
      solutionDescription: description ,
      selectedBRDs: selectedBRDs.map(String).join('\n'),
      selectedPRDs: selectedPRDs.map(String).join('\n'),
      documentData: {
        description: updatedReqt,
        documentTypeId: DbDocumentType.BP
      },
      mode: PromptMode.UPDATE,
      newBpDescription: reqDesc,
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(COMPONENT.BP, OPERATIONS.UPDATE);
    const response = await handler.invoke(messages, null, traceName);
    console.log('[update-business-process] LLM Response:', response);

    // Parse LLM response
    const cleanedResponse = repairJSON(response);
    const llmResponse = JSON.parse(cleanedResponse);

    return {
      ...validatedData,
      updated: llmResponse.updated
    };
  } catch (error) {
    console.error('Error in updateBusinessProcess:', error);
    throw error;
  }
}
