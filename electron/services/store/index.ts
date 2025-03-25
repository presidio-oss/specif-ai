import Store from 'electron-store';

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
}

export const store = StoreService.getInstance();
