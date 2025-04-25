import { solutionFactory } from "../../db/solution.factory";
import {
  documentIdSchema,
  documentRequestSchema,
  solutionIdSchema,
} from "../../schema/solution.schema";
import { llmEnhanceSchema } from "../../schema/enhance.schema";
import { IpcMainInvokeEvent } from "electron";
import { z } from "zod";
import { LLMUtils } from "../../services/llm/llm-utils";
import { buildLLMHandler } from "../../services/llm";
import { store } from "../../services/store";
import { traceBuilder } from "../../utils/trace-builder";
import { DbDocumentType, OPERATIONS, PromptMode } from "../../helper/constants";
import { repairJSON } from "../../utils/custom-json-parser";
import { withRetry } from "../../utils/retry";
import { ObservabilityManager } from "../../services/observability/observability.manager";
import {
  GenerateTasksSchema,
  GenerateUserStoriesSchema,
} from "../../agentic/common/schemas";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { createUserStoryWorkflow } from "../../agentic/user-story-workflow";
import { buildLangchainModelProvider } from "../../services/llm/llm-langchain";
import { randomUUID } from "node:crypto";
import { ICreateDocument } from "../../db/interfaces/solution.interface";
import { createTaskWorkflow } from "../../agentic/task-workflow";

export class DocumentController {
  static async getDocumentTypesWithCount(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <DocumentController.getDocumentTypesWithCount>");
    const parsedData = solutionIdSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId } = parsedData.data;
    const solutionRepository = await solutionFactory.getRepository(solutionId);
    const documentCount = await solutionRepository.getDocumentTypesWithCount();

    console.log("Exited <DocumentController.getDocumentTypesWithCount>");
    return documentCount;
  }

  static async getAllDocuments(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <DocumentController.getAllDocument>");
    const parsedData = solutionIdSchema
      .extend({
        searchQuery: z.string().optional(),
      })
      .safeParse(data);

    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId, searchQuery } = parsedData.data;
    const solutionRepository = await solutionFactory.getRepository(solutionId);
    const documents = await solutionRepository.getAllDocuments(searchQuery);

    console.log("Exited <DocumentController.getAllDocument>");
    return documents;
  }

  static async getDocument(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <DocumentController.getDocument>");
    const parsedData = documentIdSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId, documentId } = parsedData.data;
    const solutionRepository = await solutionFactory.getRepository(solutionId);
    const document = await solutionRepository.getDocument(documentId);

    console.log("Exited <DocumentController.getDocument>");
    return document;
  }

  static async addDocument(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <DocumentController.addDocument>");
    const parsedData = documentRequestSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId, documentData, linkedDocumentIds } = parsedData.data;
    await solutionFactory.runWithTransaction(
      solutionId,
      async (solutionRepository) => {
        const newDocument = await solutionRepository.createRequirement(
          documentData
        );
        if (newDocument && linkedDocumentIds.length > 0) {
          const linksPayload = linkedDocumentIds.map((targetId) => ({
            sourceDocumentId: newDocument.id,
            targetDocumentId: targetId,
          }));
          await solutionRepository.createDocumentLinks(linksPayload);
        }
        console.log("Exited <DocumentController.addDocument>");
        return newDocument;
      }
    );
  }

  static async updateDocument(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <DocumentController.updateDocument>");
    const parsedData = documentRequestSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId, documentData, linkedDocumentIds } = parsedData.data;

    await solutionFactory.runWithTransaction(
      solutionId,
      async (solutionRepository) => {
        const updatedDocument = await solutionRepository.updateDocument(
          documentData
        );

        if (updatedDocument && linkedDocumentIds.length > 0) {
          const existingDocumentLinks =
            await solutionRepository.getDocumentLinksById(updatedDocument.id);

          const existingDocumentLinksTargetIds = existingDocumentLinks
            .map((docLink) => docLink.targetDocumentId)
            .filter((id): id is number => id !== null);

          const documentsToAdd =
            linkedDocumentIds.filter(
              (docId) => !existingDocumentLinksTargetIds.includes(docId)
            ) || [];
          const documentsToRemove =
            existingDocumentLinksTargetIds.filter(
              (docId) => !linkedDocumentIds.includes(docId)
            ) || [];

          if (documentsToRemove.length > 0) {
            await solutionRepository.softDeleteDocumentLinks(
              updatedDocument.id,
              documentsToRemove
            );
          }

          if (documentsToAdd.length > 0) {
            const linksPayload = linkedDocumentIds.map((targetId) => ({
              sourceDocumentId: updatedDocument.id,
              targetDocumentId: targetId,
            }));
            await solutionRepository.createDocumentLinks(linksPayload);
          }
        }

        console.log("Exited <DocumentController.updateDocument>");
        return updatedDocument;
      }
    );
  }

  static async generateUserStories(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <DocumentController.generateUserStories>");
    const llmConfig = store.getLLMConfig();
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace("create-stories");

    if (!llmConfig) {
      throw new Error("LLM configuration not found");
    }

    const parsedData = GenerateUserStoriesSchema.safeParse(data);

    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }
    const {
      solutionId,
      requirementDescription,
      extraContext,
      technicalDetails,
      prdId,
      regenerate,
      oldUserStoriesIds,
    } = parsedData.data;
    const memoryCheckpointer = new MemorySaver();

    const userStoryWorkflow = createUserStoryWorkflow({
      model: buildLangchainModelProvider(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      ),
      checkpointer: memoryCheckpointer,
    });

    const initialState = {
      requirements: requirementDescription,
      extraContext: extraContext || "",
      technicalDetails: technicalDetails || "",
    };

    const config = {
      configurable: {
        thread_id: `${randomUUID()}_create_stories`,
        trace: trace,
      },
    };

    const stream = userStoryWorkflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });

    for await (const event of stream) {
      // Process events if needed
    }

    const response = await userStoryWorkflow.getState({
      ...config,
    });

    const stories = response.values.stories;

    console.log(
      "[create-stories] Saving user stories to database for solution ID:",
      solutionId
    );

    await solutionFactory.runWithTransaction(
      solutionId,
      async (solutionRepo) => {
        const storyRequirements = stories.map((story: ICreateDocument) => ({
          name: story.name,
          description: story.description,
          documentTypeId: DbDocumentType.USER_STORY,
        }));

        if (regenerate) {
          if (!oldUserStoriesIds || oldUserStoriesIds.length === 0) {
            // TODO: Discuss if we update on same IDs or soft delete old docs and save as new ones
            throw new Error("No old user stories found to replace");
          }
          await solutionRepo.softDeleteDocuments(oldUserStoriesIds);
          await solutionRepo.softDeleteDocumentLinks(prdId, oldUserStoriesIds);
        }
        const createdStories = await solutionRepo.createRequirements(
          storyRequirements
        );

        if (!createdStories || createdStories.length !== stories.length) {
          throw new Error("Failed to save user stories to database");
        }

        const documentLinks = createdStories.map((story) => ({
          sourceDocumentId: prdId,
          targetDocumentId: story.id,
        }));

        await solutionRepo.createDocumentLinks(documentLinks);
      }
    );

    console.log("[create-stories] Successfully saved user stories to database");

    const transformedFeatures = stories.map((feature: any) => {
      if (!feature.id || !feature.title || !feature.description) {
        throw new Error(
          `Invalid feature structure: missing required fields in ${JSON.stringify(
            feature
          )}`
        );
      }

      const transformedFeature: { id: string; [key: string]: string } = {
        id: feature.id,
      };

      transformedFeature[feature.title] = feature.description;

      return transformedFeature;
    });
    console.log("Exited <DocumentController.generateUserStories>");

    return {
      features: transformedFeatures,
    };
  }

  static async generateTasks(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <DocumentController.generateTasks>");
    const llmConfig = store.getLLMConfig();
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace("create-task");

    if (!llmConfig) {
      throw new Error("LLM configuration not found");
    }

    console.log("[create-task] Using LLM config:", llmConfig);
    const parsedData = GenerateTasksSchema.safeParse(data);

    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { solutionId, requirementTitle, extraContext, requirementDescription, storyId, regenerate, technicalDetails, oldTasksIds } =
      parsedData.data;
    const memoryCheckpointer = new MemorySaver();

    const taskWorkflow = createTaskWorkflow({
      model: buildLangchainModelProvider(
        llmConfig.activeProvider,
        llmConfig.providerConfigs[llmConfig.activeProvider].config
      ),
      checkpointer: memoryCheckpointer,
    });

    const initialState = {
      name: requirementTitle,
      userStory: requirementDescription,
      technicalDetails: technicalDetails,
      extraContext: extraContext || "",
    };

    const config = {
      configurable: {
        thread_id: `${randomUUID()}_create_tasks`,
        trace: trace,
      },
    };

    const stream = taskWorkflow.streamEvents(initialState, {
      version: "v2",
      streamMode: "messages",
      ...config,
    });

    for await (const event of stream) {
      // Process events if needed
    }

    const response = await taskWorkflow.getState({
      ...config,
    });

    const tasks = response.values.tasks;

    console.log(
      "[create-tasks] Saving tasks to database for solution ID:",
      solutionId
    );

    await solutionFactory.runWithTransaction(
      solutionId,
      async (solutionRepo) => {
        const taskRequirements = tasks
          .map((task: { name: string, acceptance: string }) => ({
            name: task.name,
            description: task.acceptance,
            documentTypeId: DbDocumentType.TASK,
          }));

        if (regenerate) {
          if (!oldTasksIds || oldTasksIds.length === 0) {
            // TODO: Discuss if we update on same IDs or soft delete old docs and save as new ones
            throw new Error("No old tasks found to replace");
          }
          await solutionRepo.softDeleteDocuments(oldTasksIds);
          await solutionRepo.softDeleteDocumentLinks(storyId, oldTasksIds);
        }

        const createdTasks = await solutionRepo.createRequirements(
          taskRequirements
        );

        if (!createdTasks || createdTasks.length !== taskRequirements.length) {
          throw new Error("Failed to save tasks to database");
        }

        const documentLinks = createdTasks.map((task) => ({
          sourceDocumentId: storyId,
          targetDocumentId: task.id,
        }));

        await solutionRepo.createDocumentLinks(documentLinks);
      }
    );

    console.log("[create-tasks] Successfully saved tasks to database");

    const transformedTasks = tasks.map((task: any) => {
      if (!task.id || !task.name || !task.acceptance) {
        throw new Error(
          `Invalid task structure: missing required fields in ${JSON.stringify(
            task
          )}`
        );
      }

      const transformedTask: { id: string; [key: string]: string } = {
        id: task.id,
      };

      transformedTask[task.name] = task.acceptance;

      return transformedTask;
    });
    
    console.log("Exited <DocumentController.generateTasks>");
    
    return {
      tasks: transformedTasks,
    };
  }

  static async exportDocuments(_: IpcMainInvokeEvent) {
    console.log("Entered <DocumentController.exportDocuments>");

    // TODO: Implement

    console.log("Exited <DocumentController.exportDocuments>");
  }

  @withRetry()
  static async enhance(_: IpcMainInvokeEvent, data: any) {
    console.log("Entered <DocumentController.enhance>");
    const llmConfig = store.getLLMConfig();
    if (!llmConfig) {
      throw new Error("LLM configuration not found");
    }

    const parsedData = llmEnhanceSchema.safeParse(data);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const { documentData, mode } = parsedData.data;

    const prompt = await LLMUtils.getDocumentEnhancerPrompt(
      documentData.documentTypeId as DbDocumentType,
      mode as PromptMode,
      parsedData.data
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
      const parsed = JSON.parse(cleanedResponse);
      if (!parsed.features || !Array.isArray(parsed.features)) {
        throw new Error("Invalid response structure");
      }
      result = parsed;
    } catch (error) {
      console.error("[add-user-story> Error parsing LLM response:", error);
      throw new Error("Failed to parse LLM response as JSON");
    }

    console.log("Exited <DocumentController.enhance>");
    return result;
  }
}
