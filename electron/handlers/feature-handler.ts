import { ipcMain } from "electron";
import { createStories } from "../api/feature/story/create";
import { updateStory } from "../api/feature/story/update";
import { chatUserStoryTask } from "../api/feature/story/chat";
import { addUserStory } from "../api/feature/story/add";

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

  ipcMain.handle('story:chat', async (_event, data: any) => {
    try {
      const result = await chatUserStoryTask(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling story:chat:', error.message);
      throw error;
    }
  });

  ipcMain.handle('story:add', async (_event, data: any) => {
    try {
      const result = await addUserStory(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling story:add:', error.message);
      throw error;
    }
  });
}
