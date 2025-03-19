import { getSuggestionsSchema } from './schema';
import { HandlebarsService } from '../../../services/template/handlebars-service';
import { AzureOpenAIHandler } from '../../../services/llm/azure-openai-handler';
import { LLMUtils } from '../../../services/llm/llm-utils';
import * as path from 'path';
import type { IpcMainInvokeEvent } from 'electron';

const templateDir = path.join(__dirname, '../../../../templates');
const handlebarsService = new HandlebarsService(templateDir);

// Check required environment variables
const apiKey = process.env.AZURE_API_KEY;
const baseUrl = process.env.AZURE_BASE_URL;
const deploymentId = process.env.AZURE_DEPLOYMENT_ID;
const apiVersion = process.env.AZURE_API_VERSION;

if (!apiKey || !baseUrl || !deploymentId) {
  console.error('[get-suggestions] Missing required Azure OpenAI environment variables');
  throw new Error('Missing required Azure OpenAI environment variables');
}

// Initialize OpenAIHandler with API key from environment variables
const azureOpenAIHandler = new AzureOpenAIHandler(
  apiKey,
  baseUrl,
  deploymentId,
  apiVersion
);

console.log('[get-suggestions] AzureOpenAIHandler initialized successfully');

export async function getSuggestions(event: IpcMainInvokeEvent, data: unknown): Promise<string[]> {
  try {
    // Validate input data using schema
    console.log('[get-suggestions] Validating input data...');
    const validatedData = getSuggestionsSchema.parse(data);
    console.log('[get-suggestions] Input data validated successfully:', validatedData);
    const { name, description, type, requirement, suggestions, selectedSuggestion, knowledgeBase } = validatedData;

    // Render the template
    console.log('[get-suggestions] Rendering template...');
    let prompt = handlebarsService.renderTemplate('improved-suggestions', {
      name,
      description,
      type,
      requirement,
      suggestions,
      selectedSuggestion,
      knowledgeBase,
    });

    // Apply knowledge base constraint if needed
    if (knowledgeBase) {
      console.log('[get-suggestions] Applying knowledge base constraint...');
      prompt = await LLMUtils.generateKnowledgeBasePromptConstraint(knowledgeBase, prompt);
    }

    // Prepare messages for LLM
    console.log('[get-suggestions] Preparing messages for LLM...');
    const messages = await LLMUtils.prepareMessages(prompt);
    console.log(prompt);

    // Invoke the LLM
    console.log('[get-suggestions] Invoking LLM...');
    const response = await azureOpenAIHandler.invoke(messages);
    console.log('[get-suggestions] LLM invocation completed. Response received:', response);

    // Parse the response
    let improvedSuggestions;
    console.log('[get-suggestions] Parsing LLM response...');
    try {
      improvedSuggestions = JSON.parse(response);
      console.log('[get-suggestions] LLM response parsed successfully:', improvedSuggestions);
    } catch (error) {
      console.error('[get-suggestions] Error parsing LLM response:', error);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return improvedSuggestions;
  } catch (error) {
    console.error('Error in getSuggestions:', error);
    throw error;
  }
}
