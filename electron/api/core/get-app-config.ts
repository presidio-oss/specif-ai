import { appConfigSchema } from '../../schema/core/app-config.schema';
import type { IpcMainInvokeEvent } from 'electron';

export async function getAppConfig(event: IpcMainInvokeEvent): Promise<{ posthogKey: string; posthogHost: string; posthogEnabled: boolean; langfuseEnabled: boolean }> {
  try {
    const config = {
      posthogKey: process.env.POSTHOG_KEY || '',
      posthogHost: process.env.POSTHOG_HOST || '',
      posthogEnabled: process.env.ENABLE_POSTHOG === 'true',
      langfuseEnabled: process.env.ENABLE_LANGFUSE === 'true'
    };

    const validatedConfig = appConfigSchema.parse(config);
    
    return validatedConfig;
  } catch (error) {
    console.error('Error in getAppConfig:', error);
    throw error;
  }
}
