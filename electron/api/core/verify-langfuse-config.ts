import type { IpcMainInvokeEvent } from 'electron';
import { verifyLangfuseConfigSchema, VerifyLangfuseConfigResponse } from '../../schema/core/verify-langfuse-config.schema';
import { Langfuse } from 'langfuse';

export async function verifyLangfuseConfig(event: IpcMainInvokeEvent, data: any): Promise<VerifyLangfuseConfigResponse> {
  try {
    console.log('[verify-langfuse-config] Verifying Langfuse configuration...');
    const validatedData = verifyLangfuseConfigSchema.parse(data);
    const baseUrl = validatedData.baseUrl || 'https://cloud.langfuse.com';
    const authString = Buffer.from(`${validatedData.publicKey}:${validatedData.secretKey}`).toString('base64');

    const response = await fetch(`${baseUrl}/api/public/projects`, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(response.status === 401 ? 
        'Invalid Langfuse credentials' : 
        `Failed to verify Langfuse configuration: ${response.statusText}`);
    }

    console.log('[verify-langfuse-config] Authentication successful');
    const langfuse = new Langfuse({
      publicKey: validatedData.publicKey,
      secretKey: validatedData.secretKey,
      baseUrl: validatedData.baseUrl,
    });

    const trace = langfuse.trace({
      name: 'config-verification',
      metadata: { test: true }
    });
    
    const span = trace.span({ name: "connection-test" });
    span.end();

    return {
      status: 'success',
      message: 'Langfuse configuration verified successfully'
    };

  } catch (error: any) {
    console.error('[verify-langfuse-config] Error during verification:', error);
    
    return {
      status: 'failed',
      message: 'Invalid Langfuse configuration. Please check your keys and host URL.',
    };
  }
}
