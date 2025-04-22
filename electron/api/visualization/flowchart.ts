import { flowchartSchema, type FlowchartResponse } from '../../schema/visualization/flowchart.schema';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { flowchartPrompt } from '../../prompts/visualization/flowchart';
import { traceBuilder } from '../../utils/trace-builder';
import { COMPONENT, OPERATIONS } from '../../helper/constants';

export async function createFlowchart(event: IpcMainInvokeEvent, data: unknown): Promise<FlowchartResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[create-flowchart] Using LLM config:', llmConfig);
    const validatedData = flowchartSchema.parse(data);

    const {
      title,
      description,
      selectedBRDs,
      selectedPRDs
    } = validatedData;

    // Generate prompt
    const prompt = flowchartPrompt({
      title,
      description,
      BRDS: selectedBRDs.join('\n'),
      PRDS: selectedPRDs.join('\n')
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const traceName = traceBuilder(COMPONENT.FLOWCHART, OPERATIONS.VISUALIZE);
    const response = await handler.invoke(messages, null, traceName);
    console.log('[create-flowchart] LLM Response:', response);

    return {
      flowChartData: response
    };
  } catch (error) {
    console.error('Error in createFlowchart:', error);
    throw error;
  }
}
