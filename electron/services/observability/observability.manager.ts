import { Langfuse } from "langfuse";
import { store } from '../store';

export class ObservabilityManager {
  private trace: any;

  constructor() {
    const tracingEnabled = store.get<boolean>('analyticsEnabled');
    console.debug("<observability-manager> init", tracingEnabled);

    if (!tracingEnabled) {
      this.trace = {
        generation: () => {
          console.debug("[observability-manager] generation method called");
          return {
            end: () => {
              console.debug("[observability-manager] generation.end method called");
            }
          };
        },
        span: () => {
          console.debug("[observability-manager] span method called");
          return {
            end: () => {
              console.debug("[observability-manager] span.end method called");
            }
          };
        },
        update: () => {
          console.debug("[observability-manager] update method called");
        },
        end: () => {
          console.debug("[observability-manager] end method called");
        }
      };
      return;
    }

    const langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    });

    const APP_CONFIG = store.get<AppConfig>('APP_CONFIG');
    const userName = APP_CONFIG?.username;

    this.trace = langfuse.trace({
      name: process.env.LANGFUSE_APP_ENDPOINT,
      userId: userName || "anonymous",
    });
    console.debug("<observability-manager> init", tracingEnabled);
  }

  public getTrace() {
    console.debug("<observability-manager> getTrace", this.trace);
    return this.trace;
  }
}

interface AppConfig {
  username?: string;
}
