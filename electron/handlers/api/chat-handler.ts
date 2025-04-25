import { AIChatController } from "../../api/ai-chat";
import { AI_CHAT_CHANNELS } from "../../constants/channels.constants";
import { ipcMain } from "electron";

export function setupChatHandlers() {
  ipcMain.handle(
    AI_CHAT_CHANNELS.GET_SUGGESTIONS,
    async (_event, data: any) => {
      try {
        const result = await AIChatController.getSuggestions(_event, data);
        return result;
      } catch (error: any) {
        console.error("Error handling aiChat:getSuggestions:", error.message);
        throw error;
      }
    }
  );

  ipcMain.handle(
    AI_CHAT_CHANNELS.GET_CHAT_HISTORY,
    async (_event, data: any) => {
      try {
        const result = await AIChatController.getChatHistory(_event, data);
        return result;
      } catch (error: any) {
        console.error("Error handling aiChat:getChatHistory:", error.message);
        throw error;
      }
    }
  );

  ipcMain.handle(AI_CHAT_CHANNELS.CHAT, async (_event, data: any) => {
    try {
      const result = await AIChatController.chat(_event, data);
      return result;
    } catch (error: any) {
      console.error("Error handling aiChat:chat:", error.message);
      throw error;
    }
  });
}
