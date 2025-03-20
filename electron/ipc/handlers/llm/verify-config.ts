import { verifyConfigSchema } from './schema';
import { buildLLMHandler, LLMProvider } from '../../../services/llm';
import type { IpcMainInvokeEvent } from 'electron';
import type { VerifyConfigResponse } from './schema';

console.log('[verify-config] Initializing LLM config verification handler');

export async function verifyConfig(event: IpcMainInvokeEvent, data: unknown): Promise<VerifyConfigResponse> {
  try {
    // Validate input data using schema
    console.log('[verify-config] Validating input data...');
    const validatedData = verifyConfigSchema.parse(data);
    console.log('[verify-config] Input data validated successfully:', validatedData);

    const { provider, model, config } = validatedData;

    // Create handler with the provided configuration
    console.log('[verify-config] Creating LLM handler...');
    const handlerConfig = {
      ...config
    };

    // If model is empty string, let the handler use the appropriate field from config
    if (model) {
      if (provider === LLMProvider.OPENAI) {
        handlerConfig.deploymentId = model;
      } else {
        handlerConfig.modelId = model;
      }
    }

    const handler = buildLLMHandler(provider as LLMProvider, handlerConfig);

    // Make a test call to verify the configuration
    console.log('[verify-config] Making test call to LLM...');
    const testPrompt = "This is a test prompt to verify the provider configuration.";
    const testMessages = [{ role: 'user', content: testPrompt }];

    const result = await handler.invoke(testMessages);
    console.log('[verify-config] Test call succeeded');

    // For the response, use the actual model ID from the handler
    const actualModel = handler.getModel().id;

    return {
      status: 'success',
      message: 'Provider configuration verified successfully',
      provider,
      model: actualModel,
      testResponse: result
    };

  } catch (error: any) {
    console.error('[verify-config] Error during verification:', error);
    
    return {
      status: 'failed',
      message: 'Model connection failed. Please validate the credentials.',
      provider: typeof data === 'object' && data ? (data as any).provider || 'unknown' : 'unknown',
      model: typeof data === 'object' && data ? (data as any).model || 'unknown' : 'unknown'
    };
  }
}
