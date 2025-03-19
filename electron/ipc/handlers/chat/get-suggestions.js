const { getSuggestionsSchema } = require('./schema');
const HandlebarsService = require('../../../services/template/handlebars-service');
const AzureOpenAIHandler = require('../../../services/llm/azure-openai-handler');
const LLMUtils = require('../../../services/llm/llm-utils');
const path = require('path');

const templateDir = path.join(__dirname, '../../../templates');
const handlebarsService = new HandlebarsService(templateDir);

// Initialize OpenAIHandler with API key from environment variables
const azureOpenAIHandler = new AzureOpenAIHandler(
  process.env.AZURE_API_KEY,
  process.env.AZURE_BASE_URL,
  process.env.AZURE_DEPLOYMENT_ID
);
console.log('[get-suggestions] AzureOpenAIHandler initialized with API key:', azureOpenAIHandler.AZURE_BASE_URL);

async function getSuggestions(event, data) {
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
      prompt = LLMUtils.generateKnowledgeBasePromptConstraint(knowledgeBase, prompt);
    }

    // Prepare messages for LLM
    console.log('[get-suggestions] Preparing messages for LLM...');
    const messages = LLMUtils.prepareMessages(prompt);
    console.log(prompt)

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
      console.error('[get-suggestions] Error parsing LLM response:', error.message);
      throw new Error('Failed to parse LLM response as JSON');
    }

    return improvedSuggestions;
  } catch (error) {
    console.error('Error in getSuggestions:', error.message);
    throw error;
  }
}

module.exports = getSuggestions;
