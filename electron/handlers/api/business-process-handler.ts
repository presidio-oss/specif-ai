import { BusinessProcessController } from "../../api/business-process";
import { BUSINESS_PROCESS_CHANNELS } from "../../constants/channels.constants";
import { ipcMain } from "electron";

export function setupBusinessProcessHandlers() {
  ipcMain.handle(
    BUSINESS_PROCESS_CHANNELS.GET_BUSINESS_PROCESS_COUNT,
    async (_event, data: any) => {
      try {
        const result = await BusinessProcessController.getBusinessProcessCount(
          _event,
          data
        );
        return result;
      } catch (error: any) {
        console.error(
          "Error handling businessProcess:getCount:",
          error.message
        );
        throw error;
      }
    }
  );

  ipcMain.handle(
    BUSINESS_PROCESS_CHANNELS.GET_BUSINESS_PROCESS,
    async (_event, data: any) => {
      try {
        const result = await BusinessProcessController.getBusinessProcess(
          _event,
          data
        );
        return result;
      } catch (error: any) {
        console.error("Error handling businessProcess:get:", error.message);
        throw error;
      }
    }
  );

  ipcMain.handle(
    BUSINESS_PROCESS_CHANNELS.GET_ALL_BUSINESS_PROCESSES,
    async (_event, data: any) => {
      try {
        const result = await BusinessProcessController.getAllBusinessProcess(
          _event,
          data
        );
        return result;
      } catch (error: any) {
        console.error("Error handling businessProcess:getAll:", error.message);
        throw error;
      }
    }
  );

  ipcMain.handle(
    BUSINESS_PROCESS_CHANNELS.GET_FLOWCHART,
    async (_event, data: any) => {
      try {
        const result = await BusinessProcessController.getFlowchart(
          _event,
          data
        );
        return result;
      } catch (error: any) {
        console.error(
          "Error handling businessProcess:getFlowchart:",
          error.message
        );
        throw error;
      }
    }
  );

  ipcMain.handle(
    BUSINESS_PROCESS_CHANNELS.ENHANCE_BUSINESS_PROCESS,
    async (_event, data: any) => {
      try {
        const result = await BusinessProcessController.enhance(_event, data);
        return result;
      } catch (error: any) {
        console.error("Error handling businessProcess:enhance:", error.message);
        throw error;
      }
    }
  );

  ipcMain.handle(
    BUSINESS_PROCESS_CHANNELS.ADD_BUSINESS_PROCESS,
    async (_event, data: any) => {
      try {
        const result = await BusinessProcessController.addBusinessProcess(
          _event,
          data
        );
        return result;
      } catch (error: any) {
        console.error("Error handling businessProcess:add:", error.message);
        throw error;
      }
    }
  );

  ipcMain.handle(
    BUSINESS_PROCESS_CHANNELS.UPDATE_BUSINESS_PROCESS,
    async (_event, data: any) => {
      try {
        const result = await BusinessProcessController.updateBusinessProcess(
          _event,
          data
        );
        return result;
      } catch (error: any) {
        console.error("Error handling businessProcess:update:", error.message);
        throw error;
      }
    }
  );

  ipcMain.handle(
    BUSINESS_PROCESS_CHANNELS.GENERATE_FLOWCHART,
    async (_event, data) => {
      try {
        const result = await BusinessProcessController.generateFlowchart(
          _event,
          data
        );
        return result;
      } catch (error: any) {
        console.error(
          "Error handling businessProcess:generateFlowchart:",
          error.message
        );
        throw error;
      }
    }
  );
}
