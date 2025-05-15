import { updateBusinessProcessSchema, type UpdateBusinessProcessResponse } from '../../../schema/requirement/business-process/update.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { updateBusinessProcessPrompt } from '../../../prompts/requirement/business-process/update';
import { repairJSON } from '../../../utils/custom-json-parser';
import { COMPONENT, OPERATIONS } from '../../../helper/constants';
import { traceBuilder } from '../../../utils/trace-builder';
import { ObservabilityManager } from '../../../services/observability/observability.manager';
import { HumanMessage } from "@langchain/core/messages";
import { isDevEnv } from '../../../utils/env';

export async function updateBusinessProcess(event: IpcMainInvokeEvent, data: any): Promise<UpdateBusinessProcessResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('update-business-process');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[update-business-process] Using LLM config:', llmConfig);
    const validationSpan = trace.span({name: "input-validation"});
    const validatedData = updateBusinessProcessSchema.parse(data);
    validationSpan.end();

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

    const traceName = traceBuilder(COMPONENT.BP, OPERATIONS.UPDATE);
    const llmSpan = trace.span({
      name: "update-business-process",
    });
    
    const generation = llmSpan.generation({
      name: "llm",
      model: llmConfig.activeProvider,
      environment: process.env.APP_ENVIRONMENT,
      input: isDevEnv() ? [new HumanMessage(prompt)] : undefined,
    });

    const response = await handler.invoke(messages, null, traceName);
    console.log('[update-business-process] LLM Response:', response);

    generation.end({
      output: isDevEnv() ? response : undefined,
    });

    llmSpan.end({
      statusMessage: "Successfully updated business process"
    });

    // Parse LLM response
    try {
      const cleanedResponse = repairJSON(response);
      const llmResponse = JSON.parse(cleanedResponse);

      return {
        ...validatedData,
        updated: llmResponse.updated
      };
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      llmSpan.end({
        level: "ERROR",
        statusMessage: `Error parsing LLM response: ${error}`
      });
      throw error;
    }
  } catch (error) {
    console.error('Error in updateBusinessProcess:', error);
    throw error;
  }
}
