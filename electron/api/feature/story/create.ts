import { createStorySchema, type CreateStoryResponse } from '../../../schema/feature/story/create.schema';
import { LLMUtils } from '../../../services/llm/llm-utils';
import { buildLLMHandler } from '../../../services/llm';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import type { LLMConfigModel } from '../../../services/llm/llm-types';
import { refinePrompt } from '../../../prompts/feature/evaluation/refine';
import { evaluatePrompt } from '../../../prompts/feature/evaluation/evaluate';
import { repairJSON } from '../../../utils/custom-json-parser';

export async function createStories(event: IpcMainInvokeEvent, data: unknown): Promise<CreateStoryResponse> {
  try {
    const llmConfig = store.get<LLMConfigModel>('llmConfig');
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    console.log('[create-stories] Using LLM config:', llmConfig);
    const validatedData = createStorySchema.parse(data);

    const {
      reqDesc,
      extraContext,
      technicalDetails
    } = validatedData;

    // 1. Generate initial features
    const prompt = refinePrompt({
      requirements: reqDesc,
      extraContext,
      technologies: technicalDetails
    });

    // Prepare messages for LLM
    const messages = await LLMUtils.prepareMessages(prompt);

    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const response = await handler.invoke(messages);
    console.log('[create-stories] Initial LLM Response:', response);

    let parsedFeatures;
    try {
      let cleanedResponse = repairJSON(response.trim());
      parsedFeatures = JSON.parse(cleanedResponse.trim());
    } catch (error) {
      console.error('Error parsing initial LLM response:', error);
      throw new Error('Invalid response format from LLM');
    }

    const evaluationPrompt = evaluatePrompt({
      requirements: reqDesc,
      features: JSON.stringify(parsedFeatures.features)
    });

    // Prepare messages for evaluation
    const evaluationMessages = await LLMUtils.prepareMessages(evaluationPrompt);
    const evaluation = await handler.invoke(evaluationMessages);
    console.log('[create-stories] Evaluation:', evaluation);

    const finalPrompt = refinePrompt({
      requirements: reqDesc,
      extraContext,
      technologies: technicalDetails,
      features: response,
      evaluation
    });

    const finalMessages = await LLMUtils.prepareMessages(finalPrompt);
    const finalResponse = await handler.invoke(finalMessages);
    console.log('[create-stories] Final LLM Response:', finalResponse);

    try {
      const parsedResponse = JSON.parse(finalResponse.trim());
      
      if (!parsedResponse.features || !Array.isArray(parsedResponse.features)) {
        throw new Error('Invalid response structure: missing features array');
      }
      
      const transformedFeatures = parsedResponse.features.map((feature: any) => {
        if (!feature.id || !feature.title || !feature.description) {
          throw new Error(`Invalid feature structure: missing required fields in ${JSON.stringify(feature)}`);
        }
        
        const transformedFeature: { id: string; [key: string]: string } = {
          id: feature.id
        };
        
        transformedFeature[feature.title] = feature.description;
        
        return transformedFeature;
      });
      
      return {
        features: transformedFeatures
      };
    } catch (error) {
      console.error('Error processing final response:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in createStories:', error);
    throw error;
  }
}
