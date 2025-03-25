import Store from 'electron-store';
import { store as storeService } from "../services/store"; 
import { ipcMain } from 'electron';

export function setupStore() {
  try {
    const store = new Store();
    storeService.initialize(store);

    ipcMain.handle("store-get", async (_event, key: string) => {
      return storeService.get(key);
    });

    ipcMain.handle("store-set", async (_event, key: string, value: any) => {
      storeService.set(key, value);
      return true;
    });

    ipcMain.handle("removeStoreValue", async (_event, key: string) => {
      storeService.delete(key);
      return true;
    });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize electron-store:', error);
    return false;
  }
}
