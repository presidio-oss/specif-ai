import { flowchartSchema, type FlowchartResponse } from '../../schema/visualization/flowchart.schema';
import { LLMUtils } from '../../services/llm/llm-utils';
import { buildLLMHandler } from '../../services/llm';
import { store } from '../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../services/llm/llm-types';
import { flowchartPrompt } from '../../prompts/visualization/flowchart';

export async function createFlowchart(event: IpcMainInvokeEvent, data: unknown): Promise<FlowchartResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
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

    const response = await handler.invoke(messages);
    console.log('[create-flowchart] LLM Response:', response);

    return {
      flowChartData: response
    };
  } catch (error) {
    console.error('Error in createFlowchart:', error);
    throw error;
  }
}
