import { solutionFactory } from "@/db/solution.factory";
import { documentIdSchema, solutionIdSchema } from "@/db/types";
import { IpcMainInvokeEvent } from "electron";

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
        const parsedData = solutionIdSchema.safeParse(data);
        if (!parsedData.success) {
            console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
            throw new Error('Schema validation failed')
        }

        const { solutionId } = data;
        const solutionRepository = await solutionFactory.getRepository(solutionId);
        const documents = await solutionRepository.getAllDocuments();

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

    static async addDocument(_: IpcMainInvokeEvent) {
        console.log('Entered <DocumentController.addDocument>');

        // TODO: Implement

        console.log('Exited <DocumentController.addDocument>');
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