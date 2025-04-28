import { solutionFactory } from "../../db/solution.factory";
import { IpcMainInvokeEvent } from "electron";
import {
  solutionIdSchema,
  searchQuerySchema,
  businessProcessIdSchema,
} from "../../schema/solution.schema";
import { LLMUtils } from "../../services/llm/llm-utils";
import { buildLLMHandler } from "../../services/llm";
import { store } from "../../services/store";
import { repairJSON } from "../../utils/custom-json-parser";
import {
  OPERATIONS,
  COMPONENT,
  PromptMode,
  DbDocumentType,
} from "../../helper/constants";
import { traceBuilder } from "../../utils/trace-builder";
import { updateBusinessProcessPrompt } from "../../prompts/requirement/business-process/update";
import { flowchartPrompt } from "../../prompts/visualization/flowchart";
import {
  addBusinessProcessSchema,
  updateBusinessProcessSchema,
  flowchartSchema,
  DocumentType,
  DocumentTypeValue,
  DocumentsArray,
} from "../../schema/businessProcess.schema";
import { withRetry } from "../../utils/retry";
import {
  IBusinessProcessEnhance,
  IBusinessProcessEnhancePrompt,
  llmEnhanceSchema,
} from "../../schema/enhance.schema";

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
    const businessProcesses = await solutionRepository.getAllBusinessProcesses(
      searchQuery
    );

    console.log("Exited <BusinessProcessController.getAllBusinessProcess>");
    return businessProcesses;
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
    const results = await solutionRepository.getBusinessProcess(
      businessProcessId
    );

    if (!results.length) return null;

    // Transform the joined results into a business process with its documents
    const businessProcess = results[0].businessProcess;
    const documents = results.map((r) => r.documents).filter(Boolean);

    console.log("Exited <BusinessProcessController.getBusinessProcess>");
    return {
      ...businessProcess,
      documents,
    };
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

      const {
        title,
        description,
        selectedBRDs,
        selectedPRDs,
        businessProcessId,
      } = validatedData;

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

      await solutionFactory.runWithTransaction(
        validatedData.solutionId,
        async (solutionRepo) => {
          await solutionRepo.updateBusinessProcess(businessProcessId, {
            flowchart: response,
          });
        }
      );

      return {
        flowChartData: response,
      };
    } catch (error) {
      console.error("Error in createFlowchart:", error);
      throw error;
    }
  }

  @withRetry()
  static async enhance(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.enhance>");
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error("LLM configuration not found");
    }

    let parsedData = llmEnhanceSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { documentData, mode, solutionId, selectedBRDs, selectedPRDs } =
      parsedData.data as IBusinessProcessEnhance;

    const { brdsText, prdsText } = await this.fetchDocumentDescriptions(
      {
        selectedBRDs,
        selectedPRDs,
      },
      solutionId
    );

    const promptData = {
      ...parsedData.data,
      selectedBRDs: brdsText,
      selectedPRDs: prdsText,
    };

    const prompt = await LLMUtils.getDocumentEnhancerPrompt(
      documentData.documentTypeId as DbDocumentType,
      mode as PromptMode,
      promptData
    );

    const messages = await LLMUtils.prepareMessages(prompt);
    const handler = buildLLMHandler(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    if (!documentData.documentTypeId) {
      throw new Error("documentTypeId is required for tracing");
    }

    const traceName = traceBuilder(
      documentData.documentTypeId,
      OPERATIONS.UPDATE
    );

    const response = await handler.invoke(messages, null, traceName);

    let result;
    try {
      const cleanedResponse = repairJSON(response);
      result = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error(
        "[enhance-business-process] Error parsing LLM response:",
        error
      );
      throw new Error("Failed to parse LLM response as JSON");
    }

    console.log("Exited <BusinessProcessController.enhance>");
    return result;
  }

  static async addBusinessProcess(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.addBusinessProcess>");
    try {
      const {
        name,
        description,
        solutionId,
        selectedBRDs: brdIds = [],
        selectedPRDs: prdIds = [],
      } = addBusinessProcessSchema.parse(data);

      return await solutionFactory.runWithTransaction(
        solutionId,
        async (solutionRepository) => {
          const businessProcess =
            await solutionRepository.createBusinessProcess({
              name,
              description,
            });
          if (!businessProcess)
            throw new Error("Failed to create business process");

          const buildDocumentLink = (
            documentId: number,
            type: DocumentTypeValue
          ) => ({
            businessProcessId: businessProcess.id,
            documentId,
            docType: type,
          });

          const documentLinks = [
            ...brdIds.map((id) => buildDocumentLink(id, DocumentType.BRD)),
            ...prdIds.map((id) => buildDocumentLink(id, DocumentType.PRD)),
          ];

          await Promise.all(
            documentLinks.map((link) =>
              solutionRepository.createBusinessProcessDocument(link)
            )
          );

          console.log("Exited <BusinessProcessController.addBusinessProcess>");
          return businessProcess;
        }
      );
    } catch (error) {
      console.error("Error in addBusinessProcess:", error);
      throw error;
    }
  }

  static async updateBusinessProcess(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.updateBusinessProcess>");
    try {
      const {
        name,
        description,
        solutionId,
        businessProcessId,
        selectedBRDs: brdIds = [],
        selectedPRDs: prdIds = [],
      } = updateBusinessProcessSchema.parse(data);

      return await solutionFactory.runWithTransaction(
        solutionId,
        async (repo) => {
          const updatedProcess = await repo.updateBusinessProcess(
            businessProcessId,
            {
              name,
              description,
            }
          );

          const existingLinks = await repo.getBusinessProcessDocuments(
            businessProcessId
          );

          const existingKeys = new Set(
            existingLinks.map((link) => `${link.docType}:${link.documentId}`)
          );

          const incomingLinks = [
            ...brdIds.map((id) => ({
              key: `${DocumentType.BRD}:${id}`,
              documentId: id,
              docType: DocumentType.BRD,
            })),
            ...prdIds.map((id) => ({
              key: `${DocumentType.PRD}:${id}`,
              documentId: id,
              docType: DocumentType.PRD,
            })),
          ];

          const incomingKeys = new Set(incomingLinks.map((link) => link.key));

          const toAdd = incomingLinks.filter(
            (link) => !existingKeys.has(link.key)
          );
          const toRemove = existingLinks.filter(
            (link) => !incomingKeys.has(`${link.docType}:${link.documentId}`)
          );

          await Promise.all([
            ...toAdd.map((link) =>
              repo.createBusinessProcessDocument({
                businessProcessId,
                documentId: link.documentId,
                docType: link.docType,
              })
            ),
            ...toRemove.map((link) =>
              repo.deleteBusinessProcessDocument(
                businessProcessId,
                link.documentId
              )
            ),
          ]);

          console.log(
            "Exited <BusinessProcessController.updateBusinessProcess>"
          );
          return updatedProcess;
        }
      );
    } catch (error) {
      console.error("Error in updateBusinessProcess:", error);
      throw error;
    }
  }

  /**
   * Fetches document descriptions for BRDs and PRDs based on the provided data.
   *
   * @param {DocumentsArray} data - Contains the selected BRD and PRD IDs
   * @param {number} solutionId - The ID of the solution to fetch documents from
   * @returns {Promise<{brdsText: string; prdsText: string}>} - Object containing BRD and PRD document descriptions
   */
  private static async fetchDocumentDescriptions(
    data: DocumentsArray,
    solutionId: number
  ): Promise<{ brdsText: string; prdsText: string }> {
    const { selectedBRDs, selectedPRDs } = data;

    try {
      const solutionRepository = await solutionFactory.getRepository(
        solutionId
      );

      /**
       * Fetches and processes documents by their IDs
       * @param {number[]} documentIds - Array of document IDs to fetch
       * @returns {Promise<string>} - Concatenated document descriptions
       */
      async function getDescriptions(documentIds: number[]): Promise<string> {
        if (!documentIds?.length) return "";

        const documents = await Promise.all(
          documentIds.map((id) => solutionRepository.getDocument(id))
        );

        return documents
          .filter((doc) => doc?.description)
          .map((doc) => doc!.description!)
          .join("\n");
      }

      const [brdsText, prdsText] = await Promise.all([
        getDescriptions(selectedBRDs),
        getDescriptions(selectedPRDs),
      ]);

      return { brdsText, prdsText };
    } catch (error) {
      console.error(
        `Error fetching document descriptions for solution ${solutionId}:`,
        error
      );
      throw new Error(
        `Failed to fetch document descriptions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
