import { DocumentController } from "@/api/document";
import { DOCUMENT_CHANNELS } from "@/constants/channels.constants";
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
}
