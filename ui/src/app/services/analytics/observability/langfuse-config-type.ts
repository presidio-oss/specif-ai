
export const LANGFUSE_CONFIG_STORE_KEY = 'LANGFUSE_CONFIG';

export interface LangfuseConfigStore {
  langfuseConfig: {
    useCustomConfig: boolean;
    config: {
      publicKey: string;
      secretKey: string;
      baseUrl?: string;
      enableDetailedTraces?: boolean;
    } | null;
  }
}
