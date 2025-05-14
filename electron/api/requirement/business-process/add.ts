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
import { ObservabilityManager } from '../../../services/observability/observability.manager';
import { HumanMessage } from "@langchain/core/messages";
import { isDevEnv } from '../../../utils/env';

export async function addBusinessProcess(event: IpcMainInvokeEvent, data: any): Promise<AddBusinessProcessResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('add-business-process');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[add-business-process] Using LLM config:', llmConfig);
    const validationSpan = trace.span({name: "input-validation"});
    const validatedData = addBusinessProcessSchema.parse(data);
    validationSpan.end();

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
    const llmSpan = trace.span({
      name: "add-business-process",
    });
    
    const generation = llmSpan.generation({
      name: "llm",
      model: llmConfig.activeProvider,
      environment: process.env.APP_ENVIRONMENT,
      input: isDevEnv() ? [new HumanMessage(prompt)] : undefined,
    });

    const response = await handler.invoke(messages, null, traceName);
    console.log('[add-business-process] LLM Response:', response);

    generation.end({
      output: isDevEnv() ? response : undefined,
    });

    llmSpan.end({
      statusMessage: "Successfully generated business process"
    });

    // Parse LLM response
    try {
      const cleanedResponse = repairJSON(response);
      const llmResponse = JSON.parse(cleanedResponse);

      return {
        ...validatedData,
        LLMreqt: llmResponse.LLMreqt
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
    console.error('Error in addBusinessProcess:', error);
    throw error;
  }
}
