import { DocumentController } from "../../api/document";
import { DOCUMENT_CHANNELS } from "../../constants/channels.constants";
import { ipcMain } from "electron";

export function setupDocumentHandlers() {
  ipcMain.handle(DOCUMENT_CHANNELS.GET_DOCUMENT_BY_COUNT, async (_event, data: any) => {
    try {
      const result = await DocumentController.getDocumentTypesWithCount(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling document:getDocumentByCount:', error.message);
      throw error;
    }
  });

  ipcMain.handle(DOCUMENT_CHANNELS.GET_DOCUMENT, async (_event, data: any) => {
    try {
      const result = await DocumentController.getDocument(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling document:getDocument:', error.message);
      throw error;
    }
  });

  ipcMain.handle(DOCUMENT_CHANNELS.GET_ALL_DOCUMENTS, async (_event, data: any) => {
    try {
      const result = await DocumentController.getAllDocuments(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling document:getDocument:', error.message);
      throw error;
    }
  });

  ipcMain.handle(DOCUMENT_CHANNELS.ADD_DOCUMENT, async (_event, data: any) => {
    try {
      const result = await DocumentController.addDocument(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling document:getDocument:', error.message);
      throw error;
    }
  });

  ipcMain.handle(DOCUMENT_CHANNELS.UPDATE_DOCUMENT, async (_event, data: any) => {
    try {
      const result = await DocumentController.updateDocument(_event, data);
      return result;
    }
    catch (error: any) {
      console.error('Error handling document:updateDocument:', error.message);
      throw error;
    }
  });

  ipcMain.handle(DOCUMENT_CHANNELS.ENHANCE_DOCUMENT, async (_event, data: any) => {
    try {
      const result = await DocumentController.enhance(_event, data);
      return result;
    }
    catch (error: any) {
      console.error('Error handling document:enhanceDocument:', error.message);
      throw error;
    }
  });

  ipcMain.handle(DOCUMENT_CHANNELS.GENERATE_STORIES, async (_event, data: any) => {
    try {
      const result = await DocumentController.generateUserStories(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling documement:generateStories:', error.message);
      throw error;
    }
  });

  ipcMain.handle(DOCUMENT_CHANNELS.GENERATE_TASKS, async (_event, data: any) => {
    try {
      const result = await DocumentController.generateTasks(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling document:generateTasks:', error.message);
      throw error;
    }
  });
}
