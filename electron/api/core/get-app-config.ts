import { appConfigSchema } from '../../schema/core/app-config.schema';
import type { IpcMainInvokeEvent } from 'electron';

export async function getAppConfig(event: IpcMainInvokeEvent): Promise<{ key: string; host: string; enabled: boolean; observabilityEnabled: boolean }> {
  try {
    const config = {
      key: process.env.POSTHOG_KEY || '',
      host: process.env.POSTHOG_HOST || '',
      enabled: process.env.ENABLE_POSTHOG === 'true',
      observabilityEnabled: process.env.ENABLE_LANGFUSE === 'true'
    };

    const validatedConfig = appConfigSchema.parse(config);
    
    return validatedConfig;
  } catch (error) {
    console.error('Error in getAppConfig:', error);
    throw error;
  }
}
