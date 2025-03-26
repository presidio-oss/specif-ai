import { Langfuse } from "langfuse";
import { IObservabilityProvider } from "./provider.interface";

export class LangfuseProvider implements IObservabilityProvider {
  createTrace(): any {
    const langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    });

    console.log('[ObservabilityManager] Using Langfuse provider');
    
    return langfuse.trace({
      name: process.env.LANGFUSE_APP_ENDPOINT || "my-llm-project",
    });
  }
}