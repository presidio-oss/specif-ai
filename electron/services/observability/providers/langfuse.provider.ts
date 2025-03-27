import { Langfuse } from "langfuse";
import { IObservabilityProvider } from "./provider.interface";
import { store } from '../../store';

interface AppConfig {
  username?: string;
}

export class LangfuseProvider implements IObservabilityProvider {
  createTrace(): any {
    const langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    });
    const APP_CONFIG = store.get<AppConfig>('APP_CONFIG');
    const userName = APP_CONFIG?.username;

    console.log('[ObservabilityManager] Using Langfuse provider');
    
    return langfuse.trace({
      name: process.env.LANGFUSE_APP_ENDPOINT,
      userId: userName || "anonymous",
    });
  }
}