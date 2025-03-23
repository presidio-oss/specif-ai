import { ipcMain } from "electron";
import { createStories } from "../api/feature/story/create";
import { updateStory } from "../api/feature/story/update";

export function setupFeatureHandlers() {
  // Story handlers
  ipcMain.handle('story:create', async (_event, data: any) => {
    try {
      const result = await createStories(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling story:create:', error.message);
      throw error;
    }
  });

  ipcMain.handle('story:update', async (_event, data: any) => {
    try {
      const result = await updateStory(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling story:update:', error.message);
      throw error;
    }
  });
}
