import { store } from '../store';
import { LangfuseConfigStore } from '.././../schema/core/verify-langfuse-config.schema';
import { LANGFUSE_CONFIG_STORE_KEY } from '.././../schema/core/verify-langfuse-config.schema';

export const isLangfuseDetailedTracesEnabled = () => {
  const langfuseConfigStore = store.get<LangfuseConfigStore>(
    LANGFUSE_CONFIG_STORE_KEY
  );

  return (
    (!langfuseConfigStore?.langfuseConfig?.useCustomConfig && process.env.ENABLE_LANGFUSE_DETAILED_TRACES === 'true') ||
    (langfuseConfigStore?.langfuseConfig?.useCustomConfig && langfuseConfigStore?.langfuseConfig?.config?.enableDetailedTraces)
  );
};
