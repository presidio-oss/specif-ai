import { solutionFactory } from "../../db/solution.factory";
import { documentIdSchema, documentRequestSchema, solutionIdSchema } from "../../schema/solution.schema";
import { IpcMainInvokeEvent } from "electron";
import { z } from "zod";
import { LLMUtils } from "../../services/llm/llm-utils";
import { buildLLMHandler } from "../../services/llm";
import { store } from '../../services/store';
import { traceBuilder } from "../../utils/trace-builder";
import { DbDocumentType, OPERATIONS, PromptMode } from "../../helper/constants";
import { repairJSON } from "../../utils/custom-json-parser";
import { withRetry } from "../../utils/retry";

export class DocumentController {
    static async getDocumentTypesWithCount(_: IpcMainInvokeEvent, data: any) {
        console.log("Entered <DocumentController.getDocumentTypesWithCount>");
        const parsedData = solutionIdSchema.safeParse(data);
        if (!parsedData.success) {
            console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
            throw new Error('Schema validation failed')
        }

        const { solutionId } = parsedData.data;
        const solutionRepository = await solutionFactory.getRepository(solutionId);
        const documentCount = await solutionRepository.getDocumentTypesWithCount();

        console.log("Exited <DocumentController.getDocumentTypesWithCount>");
        return documentCount;
    }

    static async getAllDocuments(_: IpcMainInvokeEvent, data: any) {
        console.log('Entered <DocumentController.getAllDocument>');
        const parsedData = solutionIdSchema.extend({
            searchQuery: z.string().optional()
        }).safeParse(data);
        
        if (!parsedData.success) {
            console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
            throw new Error('Schema validation failed')
        }

        const { solutionId, searchQuery } = parsedData.data;
        const solutionRepository = await solutionFactory.getRepository(solutionId);
        const documents = await solutionRepository.getAllDocuments(searchQuery);

        console.log('Exited <DocumentController.getAllDocument>');
        return documents;
    }

    static async getDocument(_: IpcMainInvokeEvent, data: any) {
        console.log('Entered <DocumentController.getDocument>');
        const parsedData = documentIdSchema.safeParse(data);
        if (!parsedData.success) {
            console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
            throw new Error('Schema validation failed')
        }

        const { solutionId, documentId } = parsedData.data;
        const solutionRepository = await solutionFactory.getRepository(solutionId);
        const document = await solutionRepository.getDocument(documentId);

        console.log('Exited <DocumentController.getDocument>');
        return document;
    }

    static async addDocument(_: IpcMainInvokeEvent, data: any) {
        console.log('Entered <DocumentController.addDocument>');
        const parsedData = documentRequestSchema.safeParse(data);
        if (!parsedData.success) {
            console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
            throw new Error('Schema validation failed');
        }

        const { solutionId, documentData, linkedDocumentIds } = parsedData.data;
        await solutionFactory.runWithTransaction(solutionId, async (solutionRepository) => {
            const newDocument = await solutionRepository.createRequirement(documentData);
            if (newDocument && linkedDocumentIds.length > 0) {
                const linksPayload = linkedDocumentIds.map(targetId => ({
                    sourceDocumentId: newDocument.id,
                    targetDocumentId: targetId
                }));
                await solutionRepository.createDocumentLinks(linksPayload);
            }
            console.log('Exited <DocumentController.addDocument>');
            return newDocument;
        });
    }

    static async updateDocument(_: IpcMainInvokeEvent, data: any) {
        console.log('Entered <DocumentController.updateDocument>');
        const parsedData = documentRequestSchema.safeParse(data);
        if (!parsedData.success) {
            console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
            throw new Error('Schema validation failed');
        }
        const { solutionId, documentData, linkedDocumentIds } = parsedData.data;
        await solutionFactory.runWithTransaction(solutionId, async (solutionRepository) => {
            const updatedDocument = await solutionRepository.updateDocument(documentData);
            if (updatedDocument && linkedDocumentIds.length > 0) {
                // TODO: Implement document link updates
                // const linksPayload = linkedDocumentIds.map(targetId => ({
                //     sourceDocumentId: updatedDocument.id,
                //     targetDocumentId: targetId
                // }));
                // await solutionRepository.createDocumentLinks(linksPayload);
            }
            console.log('Exited <DocumentController.updateDocument>');
            return updatedDocument;
        });
    }

    static async generateDocuments(_: IpcMainInvokeEvent) {
        console.log('Entered <DocumentController.generateDocuments>');

        // TODO: Implement

        console.log('Exited <DocumentController.generateDocuments>');
    }

    static async exportDocuments(_: IpcMainInvokeEvent) {
        console.log('Entered <DocumentController.exportDocuments>');

        // TODO: Implement

        console.log('Exited <DocumentController.exportDocuments>');
    }

    @withRetry()
    static async enhance(_: IpcMainInvokeEvent, data: any) {
        console.log('Entered <DocumentController.enhance>');
        const llmConfig = store.getLLMConfig();
        if (!llmConfig) {
        throw new Error('LLM configuration not found');
        }

        const { documentData, mode } = data;
        // check if data is of type ILLMEnhance
        
        const prompt = await LLMUtils.getDocumentEnhancerPrompt(documentData.documentTypeId as DbDocumentType, mode as PromptMode, data);
        
        const messages = await LLMUtils.prepareMessages(prompt);
        const handler = buildLLMHandler(
            llmConfig.activeProvider,
            llmConfig.providerConfigs[llmConfig.activeProvider].config
        );
    
        if (!documentData.documentTypeId) {
            throw new Error('documentTypeId is required for tracing');
        }

        const traceName = traceBuilder(documentData.documentTypeId, OPERATIONS.UPDATE);
        const response = await handler.invoke(messages, null, traceName);
        
        let result;
        try {
            const cleanedResponse = repairJSON(response); 
            const parsed = JSON.parse(cleanedResponse);
            if (!parsed.features || !Array.isArray(parsed.features)) {
                throw new Error('Invalid response structure');
            }
            result = parsed;
        } catch (error) {
            console.error('[add-user-story> Error parsing LLM response:', error);
            throw new Error('Failed to parse LLM response as JSON');
        }

        console.log('Exited <DocumentController.enhance>');
        return result;
    }
}
