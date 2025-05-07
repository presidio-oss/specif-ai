import { Langfuse } from "langfuse";
import { AppConfig } from ".././../schema/core/store.schema";
import { store } from "../store";

export class ObservabilityManager {
  private static instance: ObservabilityManager;
  private langfuse: Langfuse | null = null;
  private tracingEnabled: boolean;
  private userName: string;

  private constructor() {
    const analyticsEnabled = store.get<boolean>("analyticsEnabled") || false;
    const APP_CONFIG = store.get<AppConfig>("APP_CONFIG");
    this.userName = APP_CONFIG?.username || "anonymous";
    this.tracingEnabled = analyticsEnabled && (process.env.ENABLE_LANGFUSE === 'true' || false);

    if (this.tracingEnabled) {
      this.langfuse = new Langfuse({
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL,
      });
    }
    console.debug("<observability-manager> init", this.tracingEnabled);
  }

  public static getInstance(): ObservabilityManager {
    if (!ObservabilityManager.instance) {
      ObservabilityManager.instance = new ObservabilityManager();
    }
    return ObservabilityManager.instance;
  }

  public createTrace(name: string) {
    if (!this.tracingEnabled || !this.langfuse) {
      return this.getMockTrace();
    }

    return this.langfuse.trace({
      name,
      userId: this.userName,
    });
  }

  private getMockTrace() {
    return {
      generation: () => {
        console.debug("[observability-manager] generation method called");
        return {
          end: () => {
            console.debug(
              "[observability-manager] generation.end method called"
            );
          },
        };
      },
      span: () => {
        console.debug("[observability-manager] span method called");
        return {
          end: () => {
            console.debug("[observability-manager] span.end method called");
          },
          span: () => this.getMockTrace(),
          generation: () => this.getMockTrace(),
        };
      },
      update: () => {
        console.debug("[observability-manager] update method called");
      },
      end: () => {
        console.debug("[observability-manager] end method called");
      },
    };
  }
}
