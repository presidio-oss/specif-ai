import { Langfuse } from "langfuse";
import { AppConfig } from ".././../schema/core/store.schema";
import { store } from "../store";
import { LLMConfigModel } from "../../services/llm/llm-types";
import { buildLLMHandler } from "../../services/llm";
import { LANGFUSE_CONFIG_STORE_KEY, LangfuseConfigStore } from '.././../schema/core/verify-langfuse-config.schema';

interface LangfuseConfig {
  useCustomConfig: boolean;
  config: {
    publicKey: string;
    secretKey: string;
    baseUrl?: string;
    enableDetailedTraces?: boolean;
  } | null;
}

export class ObservabilityManager {
  private static instance: ObservabilityManager;
  private langfuse: Langfuse | null = null;
  private tracingEnabled: boolean = false;
  private userName: string = "";
  private model: string = "";
  private provider: string = ""
  private lastAnalyticsUserConsentState: boolean = false;
  private langfuseConfig: LangfuseConfig = {
    useCustomConfig: false,
    config: null
  };

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
    const langfuseConfigStore = store.get<LangfuseConfigStore>(LANGFUSE_CONFIG_STORE_KEY);

    // Update Langfuse config from store
    this.langfuseConfig = langfuseConfigStore?.langfuseConfig || {
      useCustomConfig: false,
      config: null
    };

    const LLM_CONFIG = store.get<LLMConfigModel>('llmConfig');
    this.provider = LLM_CONFIG?.activeProvider || "unknown";

    if (LLM_CONFIG?.providerConfigs[this.provider]?.config) {
      try {
        const handler = buildLLMHandler(this.provider, LLM_CONFIG.providerConfigs[this.provider].config);
        const modelInfo = handler.getModel();
        this.model = modelInfo.id;
      } catch (error) {
        console.error("Failed to get model info:", error);
        this.model = "unknown";
      }
    } else {
      this.model = "unknown";
    }

    this.userName = APP_CONFIG?.username || "anonymous";
    const analyticsUserConsentEnabled = store.get<boolean>("analyticsEnabled") || false;
    this.tracingEnabled = analyticsUserConsentEnabled && (process.env.ENABLE_LANGFUSE === 'true' || (this.langfuseConfig.useCustomConfig && !!this.langfuseConfig.config));
    
    if (this.tracingEnabled) {
      // Use custom config if enabled, otherwise fall back to env vars
      const config = this.langfuseConfig.useCustomConfig && this.langfuseConfig.config
        ? {
            secretKey: this.langfuseConfig.config.secretKey,
            publicKey: this.langfuseConfig.config.publicKey,
            baseUrl: this.langfuseConfig.config.baseUrl,
            enableDetailedTraces: this.langfuseConfig.config.enableDetailedTraces,
          }
        : {
            secretKey: process.env.LANGFUSE_SECRET_KEY,
            publicKey: process.env.LANGFUSE_PUBLIC_KEY,
            baseUrl: process.env.LANGFUSE_BASE_URL,
            enableDetailedTraces: process.env.ENABLE_DETAILED_TRACES,
          };

      this.langfuse = new Langfuse(config);
    }
    console.debug("<observability-manager> init", {
      tracingEnabled: this.tracingEnabled,
      usingCustomConfig: this.langfuseConfig.useCustomConfig
    });
  }

  public static getInstance(): ObservabilityManager {
    if (!ObservabilityManager.instance) {
      ObservabilityManager.instance = new ObservabilityManager();
    }
    return ObservabilityManager.instance;
  }

  private checkAndUpdateTracing(): void {
    const langfuseConfigStore = store.get<LangfuseConfigStore>(LANGFUSE_CONFIG_STORE_KEY);
    const currentAnalyticsUserConsentState = store.get<boolean>("analyticsEnabled") || false;
    const currentLangfuseConfig = langfuseConfigStore?.langfuseConfig;

    // Reinitialize if analytics state or Langfuse config has changed
    if (currentAnalyticsUserConsentState !== this.lastAnalyticsUserConsentState || 
        JSON.stringify(currentLangfuseConfig) !== JSON.stringify(this.langfuseConfig)) {
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
      environment: process.env.APP_ENVIRONMENT,
      name,
      userId: this.userName,
      metadata: {
        provider: this.provider,
        model: this.model
      }
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
