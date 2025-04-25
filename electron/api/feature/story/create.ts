import { createStorySchema, type CreateStoryResponse } from '../../../schema/feature/story/create.schema';
import { store } from '../../../services/store';
import type { IpcMainInvokeEvent } from 'electron';
import { DbDocumentType } from '../../../helper/constants';
import { traceBuilder } from '../../../utils/trace-builder';
import { createUserStoryWorkflow } from '../../../agentic/user-story-workflow';
import { buildLangchainModelProvider } from '../../../services/llm/llm-langchain';
import { MemorySaver } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import { ObservabilityManager } from '../../../services/observability/observability.manager';
import { solutionFactory } from '../../../db/solution.factory';
import { ICreateDocument } from '../../../db/interfaces/solution.interface';

export async function createStories(event: IpcMainInvokeEvent, data: unknown): Promise<CreateStoryResponse> {
  try {
    const llmConfig = store.getLLMConfig();
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('create-stories');
    
    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }
    console.log('[create-stories] Using LLM config:', llmConfig);
    
    const validatedData = createStorySchema.parse(data);
    const {
      solutionId,
      reqDesc,
      extraContext,
      technicalDetails,
      prdId
    } = validatedData;
    
    const memoryCheckpointer = new MemorySaver();
    
    const userStoryWorkflow = createUserStoryWorkflow({
      model: buildLangchainModelProvider(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      ),
      checkpointer: memoryCheckpointer
    });
    
    const initialState = {
      requirements: reqDesc,
      extraContext: extraContext || "",
      technicalDetails: technicalDetails || ""
    };
    
    const config = {
      "configurable": {
        "thread_id": `${randomUUID()}_create_stories`,
        "trace": trace
      }
    };
    
    const stream = userStoryWorkflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });
    
    for await (const event of stream) {
      // Process events if needed
    }
    
    const response = await userStoryWorkflow.getState({
      ...config
    });
    
    const stories = response.values.stories;
    
    try {
      console.log('[create-stories] Saving user stories to database for solution ID:', solutionId);
      
      await solutionFactory.runWithTransaction(
        solutionId,
        async (solutionRepo) => {
          const storyRequirements = stories.map((story: ICreateDocument) => ({
            name: story.name,
            description: story.description,
            documentTypeId: DbDocumentType.USER_STORY
          }));
          
          const createdStories = await solutionRepo.createRequirements(storyRequirements);
          
          if (!createdStories || createdStories.length !== stories.length) {
            throw new Error('Failed to save user stories to database');
          }
          
          const documentLinks = createdStories.map(story => ({
            sourceDocumentId: story.id,
            targetDocumentId: prdId
          }));
          
          await solutionRepo.createDocumentLinks(documentLinks);
        }
      );
      
      console.log('[create-stories] Successfully saved user stories to database');
      
      const transformedFeatures = stories.map((feature: any) => {
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
      console.error('Error processing response:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in createStories:', error);
    throw error;
  }
}
