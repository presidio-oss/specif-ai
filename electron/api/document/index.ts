import { solutionFactory } from "../../db/solution.factory";
import { documentIdSchema, documentRequestSchema, solutionIdSchema } from "../../schema/solution.schema";
import { IpcMainInvokeEvent } from "electron";
import { z } from "zod";

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

    static async updateDocument(_: IpcMainInvokeEvent) {
        console.log('Entered <DocumentController.updateDocument>');

        // TODO: Implement

        console.log('Exited <DocumentController.updateDocument>');
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

    static async enhance(_: IpcMainInvokeEvent) {
        console.log('Entered <DocumentController.enhance>');

        // TODO: Implement

        console.log('Exited <DocumentController.enhance>');
    }
}
