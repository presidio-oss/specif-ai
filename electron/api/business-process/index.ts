import { solutionFactory } from "../../db/solution.factory";
import { IpcMainInvokeEvent } from "electron";
import {
  addBusinessProcessSchema,
  type AddBusinessProcessResponse,
} from "../../schema/requirement/business-process/add.schema";
import {
  updateBusinessProcessSchema,
  type UpdateBusinessProcessResponse,
} from "../../schema/requirement/business-process/update.schema";
import {
  solutionIdSchema,
  searchQuerySchema,
  businessProcessIdSchema,
} from "../../schema/solution.schema";
import { LLMUtils } from "../../services/llm/llm-utils";
import { buildLLMHandler } from "../../services/llm";
import { store } from "../../services/store";
import { addBusinessProcessPrompt } from "../../prompts/requirement/business-process/add";
import { repairJSON } from "../../utils/custom-json-parser";
import { OPERATIONS, COMPONENT } from "../../helper/constants";
import { traceBuilder } from "../../utils/trace-builder";
import { updateBusinessProcessPrompt } from "../../prompts/requirement/business-process/update";
import { flowchartSchema } from "../../schema/visualization/flowchart.schema";
import { flowchartPrompt } from "../../prompts/visualization/flowchart";

export class BusinessProcessController {
  static async getBusinessProcessCount(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.getBusinessProcessCount>");
    const parsedData = solutionIdSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId } = data;
    const solutionRepository = await solutionFactory.getRepository(solutionId);
    const count = await solutionRepository.getBusinessProcessCount();

    console.log("Exited <BusinessProcessController.getBusinessProcessCount>");
    return count;
  }

  static async getAllBusinessProcess(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.getAllBusinessProcess>");
    const parsedData = searchQuerySchema.safeParse(data);

    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId, searchQuery } = parsedData.data;
    const solutionRepository = await solutionFactory.getRepository(solutionId);
    const processes = await solutionRepository.getAllBusinessProcesses(
      searchQuery
    );

    console.log("Exited <BusinessProcessController.getAllBusinessProcess>");
    return processes;
  }

  static async getBusinessProcess(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.getBusinessProcess>");
    const parsedData = businessProcessIdSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId, businessProcessId } = parsedData.data;
    const solutionRepository = await solutionFactory.getRepository(solutionId);
    const process = await solutionRepository.getBusinessProcess(
      businessProcessId
    );

    console.log("Exited <BusinessProcessController.getBusinessProcess>");
    return process;
  }

  static async getFlowchart(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.getFlowchart>");
    const parsedData = businessProcessIdSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId, businessProcessId } = parsedData.data;
    const solutionRepository = await solutionFactory.getRepository(solutionId);
    const flowchart = await solutionRepository.getBusinessProcessFlowchart(
      businessProcessId
    );

    console.log("Exited <BusinessProcessController.getFlowchart>");
    return flowchart;
  }

  static async generateFlowchart(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.generateMermaid>");

    try {
      const llmConfig = store.getLLMConfig();
      if (!llmConfig) {
        throw new Error("LLM configuration not found");
      }

      console.log("[create-flowchart] Using LLM config:", llmConfig);
      const validatedData = flowchartSchema.parse(data);

      const { title, description, selectedBRDs, selectedPRDs } = validatedData;

      // Generate prompt
      const prompt = flowchartPrompt({
        title,
        description,
        BRDS: selectedBRDs.join("\n"),
        PRDS: selectedPRDs.join("\n"),
      });

      // Prepare messages for LLM
      const messages = await LLMUtils.prepareMessages(prompt);

      const handler = buildLLMHandler(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      );

      const traceName = traceBuilder(COMPONENT.FLOWCHART, OPERATIONS.VISUALIZE);
      const response = await handler.invoke(messages, null, traceName);
      console.log("[create-flowchart] LLM Response:", response);

      console.log("Exited <BusinessProcessController.generateMermaid>");

      return {
        flowChartData: response,
      };
    } catch (error) {
      console.error("Error in createFlowchart:", error);
      throw error;
    }
  }

  static async addBusinessProcess(
    _: IpcMainInvokeEvent,
    data: any
  ): Promise<AddBusinessProcessResponse> {
    console.log("Entered <BusinessProcessController.addBusinessProcess>");
    try {
      const llmConfig = store.getLLMConfig();
      if (!llmConfig) {
        throw new Error("LLM configuration not found");
      }

      console.log("[add-business-process] Using LLM config:", llmConfig);
      const validatedData = addBusinessProcessSchema.parse(data);

      const {
        name,
        description,
        reqt,
        solutionId,
        selectedBRDs = [],
        selectedPRDs = [],
      } = validatedData;

      if (!validatedData.useGenAI) {
        await solutionFactory.runWithTransaction(
          solutionId,
          async (solutionRepo) => {
            await solutionRepo.createBusinessProcess({
              name: validatedData.title || "",
              description: reqt || "",
            });

            // Todo: Add selectedBRDs and selectedPRDs to the business process Document Table
          }
        );
      }

      // Generate prompt
      const prompt = addBusinessProcessPrompt({
        name,
        description,
        newReqt: reqt || "",
        BRDS: selectedBRDs.join("\n"),
        PRDS: selectedPRDs.join("\n"),
      });

      // Prepare messages for LLM
      const messages = await LLMUtils.prepareMessages(prompt);

      const handler = buildLLMHandler(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      );

      const traceName = traceBuilder(COMPONENT.BP, OPERATIONS.ADD);
      const response = await handler.invoke(messages, null, traceName);
      console.log("[add-business-process] LLM Response:", response);

      // Parse LLM response
      const cleanedResponse = repairJSON(response);
      const llmResponse = JSON.parse(cleanedResponse);

      console.log(
        "[add-business-process] LLM Response after parsing:",
        llmResponse
      );

      await solutionFactory.runWithTransaction(
        solutionId,
        async (solutionRepo) => {
          await solutionRepo.createBusinessProcess({
            name: llmResponse.LLMreqt.title,
            description: llmResponse.LLMreqt.requirement,
          });

          // Todo: Add selectedBRDs and selectedPRDs to the business process Document Table
        }
      );

      return {
        ...validatedData,
        LLMreqt: llmResponse.LLMreqt,
      };
    } catch (error) {
      console.error("Error in addBusinessProcess:", error);
      throw error;
    }
  }

  static async updateBusinessProcess(
    _: IpcMainInvokeEvent,
    data: any
  ): Promise<UpdateBusinessProcessResponse> {
    console.log("Entered <BusinessProcessController.updateBusinessProcess>");
    try {
      const llmConfig = store.getLLMConfig();
      if (!llmConfig) {
        throw new Error("LLM configuration not found");
      }

      console.log("[update-business-process] Using LLM config:", llmConfig);
      const validatedData = updateBusinessProcessSchema.parse(data);

      const {
        name,
        description,
        updatedReqt,
        reqDesc,
        selectedBRDs = [],
        selectedPRDs = [],
        solutionId,
        buisinessProcessId,
      } = validatedData;

      if (!validatedData.useGenAI) {
        await solutionFactory.runWithTransaction(
          solutionId,
          async (solutionRepo) => {
            await solutionRepo.updateBusinessProcess(buisinessProcessId, {
              name: validatedData.title || "",
              description: updatedReqt || "",
            });
          }
          // Todo: Add selectedBRDs and selectedPRDs to the business process Document Table
        );
      }

      // Generate prompt
      const prompt = updateBusinessProcessPrompt({
        name,
        description,
        existingReqt: reqDesc,
        updatedReqt: updatedReqt || "",
        BRDS: selectedBRDs.join("\n"),
        PRDS: selectedPRDs.join("\n"),
      });

      // Prepare messages for LLM
      const messages = await LLMUtils.prepareMessages(prompt);

      const handler = buildLLMHandler(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      );

      const traceName = traceBuilder(COMPONENT.BP, OPERATIONS.UPDATE);
      const response = await handler.invoke(messages, null, traceName);
      console.log("[update-business-process] LLM Response:", response);

      // Parse LLM response
      const cleanedResponse = repairJSON(response);
      const llmResponse = JSON.parse(cleanedResponse);

      console.log(
        "[update-business-process] LLM Response after parsing:",
        llmResponse
      );

      await solutionFactory.runWithTransaction(
        solutionId,
        async (solutionRepo) => {
          await solutionRepo.updateBusinessProcess(buisinessProcessId, {
            name: llmResponse.updated.title,
            description: llmResponse.updated.requirement,
          });
        }

        // Todo: Add selectedBRDs and selectedPRDs to the business process Document Table
      );

      return {
        ...validatedData,
        updated: llmResponse.updated,
      };
    } catch (error) {
      console.error("Error in updateBusinessProcess:", error);
      throw error;
    }
  }
}
