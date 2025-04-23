import { solutionFactory } from "@/db/solution.factory";
import { IpcMainInvokeEvent } from "electron";

export class DocumentController {

    static async getDocumentTypesWithCount(_: IpcMainInvokeEvent, solutionId: number) {
        console.log("Entered <DocumentController.getDocumentTypesWithCount>");

        const solutionRepository = await solutionFactory.getRepository(solutionId);
        const documentCount = await solutionRepository.getDocumentTypesWithCount();

        console.log("Exited <DocumentController.getDocumentTypesWithCount>");
        return documentCount;
    }

    static async getAllDocument(_: IpcMainInvokeEvent) {
        console.log('Entered <DocumentController.getAllDocument>');

        // TODO: Implement
        // Please use the same API for search

        console.log('Exited <DocumentController.getAllDocument>');
    }

    static async getDocument(_: IpcMainInvokeEvent) {
        console.log('Entered <DocumentController.getDocument>');

        // TODO: Implement

        console.log('Exited <DocumentController.getDocument>');
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