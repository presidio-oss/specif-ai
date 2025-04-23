import { solutionFactory } from "@/db/solution.factory";
import { documentIdSchema, documentRequestSchema, solutionIdSchema } from "@/db/types";
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

        const { solutionId } = data;
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
        const solutionRepository = await solutionFactory.getRepository(solutionId);
        const newDocument = await solutionRepository.createRequirement(documentData);

        // Create document links if linkedDocumentIds are provided
        if (linkedDocumentIds && linkedDocumentIds.length > 0 && newDocument) {
            try {
                await DocumentController.createDocumentLinks(solutionId, newDocument.id, linkedDocumentIds);
            } catch (error) {
                console.error(`Error creating document links: ${error}`);
            }
        }

        console.log('Exited <DocumentController.addDocument>');
        return newDocument;
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

    // FIXME: Check if document types can be received from payload or if needed at all
    // Get the source document to determine its type
    private static async createDocumentLinks(solutionId: number, sourceDocumentId: number, targetDocumentIds: number[]) {
        console.log('Entered <DocumentController.createDocumentLinks>');
    
        if (!targetDocumentIds || targetDocumentIds.length === 0) {
            console.log('No target document IDs provided');
            return [];
        }
    
        const solutionRepository = await solutionFactory.getRepository(solutionId);
    
        // Prepare all link objects
        const linksPayload = targetDocumentIds.map(targetId => ({
            sourceDocumentId,
            targetDocumentId: targetId
        }));
    
        const insertedLinks = await solutionRepository.createDocumentLinks(linksPayload);
    
        console.log('Exited <DocumentController.createDocumentLinks>');
        return insertedLinks;
    }
    
}
