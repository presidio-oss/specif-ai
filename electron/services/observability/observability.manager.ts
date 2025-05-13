import { Langfuse } from "langfuse";
import { AppConfig } from ".././../schema/core/store.schema";
import { store } from "../store";

export class ObservabilityManager {
  private static instance: ObservabilityManager;
  private langfuse: Langfuse | null = null;
  private tracingEnabled: boolean = false;
  private userName: string = "";
  private lastAnalyticsUserConsentState: boolean = false;

  private constructor() {
    this.initializeTracing();
    this.lastAnalyticsUserConsentState = store.get<boolean>("analyticsEnabled") || false;
  }
  /**
   * Initializes the tracing configuration based on the environment variables and app config.
   * It sets up the Langfuse instance if tracing is enabled.
   */
  private initializeTracing(): void {
    const APP_CONFIG = store.get<AppConfig>("APP_CONFIG");
    this.userName = APP_CONFIG?.username || "anonymous";
    const analyticsUserConsentEnabled = store.get<boolean>("analyticsEnabled") || false;
    this.tracingEnabled = analyticsUserConsentEnabled && (process.env.ENABLE_LANGFUSE === 'true' || false);
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

  private checkAndUpdateTracing(): void {
    const currentAnalyticsUserConsentState = store.get<boolean>("analyticsEnabled") || false;
    if (currentAnalyticsUserConsentState !== this.lastAnalyticsUserConsentState) {
      this.initializeTracing();
      this.lastAnalyticsUserConsentState = currentAnalyticsUserConsentState;
    }
  }

  public createTrace(name: string) {
    // Only reinitialize if analytics state has changed
    this.checkAndUpdateTracing();
    
    // Check if tracing is enabled based on current configuration
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
