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
import { addBusinessProcessPrompt } from "../../prompts/requirement/business-process/add";
import { repairJSON } from "../../utils/custom-json-parser";
import { OPERATIONS, COMPONENT } from "../../helper/constants";
import { traceBuilder } from "../../utils/trace-builder";
import { updateBusinessProcessPrompt } from "../../prompts/requirement/business-process/update";
import { flowchartPrompt } from "../../prompts/visualization/flowchart";
import {
  addBusinessProcessSchema,
  updateBusinessProcessSchema,
  flowchartSchema,
  enhanceBusinessProcessSchema,
  DocumentType,
  DocumentTypeValue,
  BusinessProcessPromptData,
  OperationType,
} from "../../schema/businessProcess.schema";

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

  static async enhance(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <BusinessProcessController.enhance>");
    try {
      const llmConfig = store.getLLMConfig();
      if (!llmConfig) {
        throw new Error("LLM configuration not found");
      }

      console.log("[enhance-business-process] Using LLM config:", llmConfig);
      const validatedData = enhanceBusinessProcessSchema.parse(data);

      const {
        type,
        name,
        description,
        reqt = "",
        reqDesc = "",
        updatedReqt = "",
        selectedBRDs = [],
        selectedPRDs = [],
      } = validatedData;

      const prompt = this.generatePrompt(type, {
        name,
        description,
        reqt,
        reqDesc,
        updatedReqt,
        selectedBRDs,
        selectedPRDs,
      });

      // Prepare messages for LLM
      const messages = await LLMUtils.prepareMessages(prompt);

      const handler = buildLLMHandler(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      );

      const traceName = traceBuilder(
        COMPONENT.BP,
        type === OPERATIONS.ADD ? OPERATIONS.ADD : OPERATIONS.UPDATE
      );
      const response = await handler.invoke(messages, null, traceName);
      console.log("[enhance-business-process] LLM Response:", response);

      // Parse LLM response
      const cleanedResponse = repairJSON(response);
      const llmResponse = JSON.parse(cleanedResponse);

      console.log("Exited <BusinessProcessController.enhance>");

      return {
        data:
          type === OPERATIONS.ADD ? llmResponse.LLMreqt : llmResponse.updated,
      };
    } catch (error) {
      console.error("Error in enhance:", error);
      throw error;
    }
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
   * Generates the appropriate prompt based on operation type
   */
  private static generatePrompt(
    type: OperationType,
    data: BusinessProcessPromptData
  ): string {
    const {
      name,
      description,
      reqt,
      reqDesc,
      updatedReqt,
      selectedBRDs,
      selectedPRDs,
    } = data;
    const brdsText = selectedBRDs.join("\n");
    const prdsText = selectedPRDs.join("\n");

    switch (type) {
      case OPERATIONS.ADD:
        return addBusinessProcessPrompt({
          name,
          description,
          newReqt: reqt,
          BRDS: brdsText,
          PRDS: prdsText,
        });
      case OPERATIONS.UPDATE:
        return updateBusinessProcessPrompt({
          name,
          description,
          existingReqt: reqDesc,
          updatedReqt,
          BRDS: brdsText,
          PRDS: prdsText,
        });
      default:
        throw new Error(`Invalid operation type: ${type}`);
    }
  }
}
