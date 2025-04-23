import { IpcMainInvokeEvent } from "electron";

export class BusinessProcessController {

    static async getBusinessProcessCount(_: IpcMainInvokeEvent) {
        console.log('Entered <BusinessProcessController.getBusinessProcessCount>');

        // TODO: Implement

        console.log('Exited <BusinessProcessController.getBusinessProcessCount>');
    }

    static async getAllBusinessProcess(_: IpcMainInvokeEvent) {
        console.log('Entered <BusinessProcessController.getAllBusinessProcess>');

        // TODO: Implement
        // Please use the same API for search

        console.log('Exited <BusinessProcessController.getAllBusinessProcess>');
    }

    static async getBusinessProcess(_: IpcMainInvokeEvent) {
        console.log('Entered <BusinessProcessController.getBusinessProcess>');

        // TODO: Implement

        console.log('Exited <BusinessProcessController.getBusinessProcess>');
    }

    static async getMermaid(_: IpcMainInvokeEvent) {
        console.log('Entered <BusinessProcessController.getMermaid>');

        // TODO: Implement

        console.log('Exited <BusinessProcessController.getMermaid>');
    }

    static async generateMermaid(_: IpcMainInvokeEvent) {
        console.log('Entered <BusinessProcessController.generateMermaid>');

        // TODO: Implement

        console.log('Exited <BusinessProcessController.generateMermaid>');
    }

    static async enhance(_: IpcMainInvokeEvent) {
        console.log('Entered <BusinessProcessController.enhance>');

        // TODO: Implement

        console.log('Exited <BusinessProcessController.enhance>');
    }

}