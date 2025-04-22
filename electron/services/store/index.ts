import Store from 'electron-store';
import { LLMConfigModel } from '../../services/llm/llm-types';
import { AppConfig } from '../../schema/core/store.schema';

export enum StoreConfig {
    LLM_CONFIG = 'llmConfig',
    APP_CONFIG = 'APP_CONFIG',
    ANALYTICS_ENABLED = 'analyticsEnabled'
}

class StoreService {
    private static instance: StoreService;
    private store: Store | null = null;

    private constructor() {}

    public static getInstance(): StoreService {
        if (!StoreService.instance) {
            StoreService.instance = new StoreService();
        }
        return StoreService.instance;
    }

    public initialize(store: Store) {
        if (!this.store) {
            this.store = store;
        }
    }

    // Standard utilities

    public get<T>(key: string): T | undefined {
        if (!this.store) {
            throw new Error('Store not initialized');
        }
        return this.store.get(key) as T;
    }

    public set(key: string, value: any): void {
        if (!this.store) {
            throw new Error('Store not initialized');
        }
        this.store.set(key, value);
    }

    public delete(key: string): void {
        if (!this.store) {
            throw new Error('Store not initialized');
        }
        this.store.delete(key);
    }

    // Application utilities

    public getLLMConfig() {
        return this.get<LLMConfigModel>(StoreConfig.LLM_CONFIG)
    }

    public getAppConfig() {
        return this.get<AppConfig>(StoreConfig.APP_CONFIG)
    }

    public isAnalyticsEnabled() {
        return this.get<boolean>(StoreConfig.ANALYTICS_ENABLED)
    }
}

export const store = StoreService.getInstance();
