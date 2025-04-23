import { IpcMainInvokeEvent } from "electron";

export class AIChatController {

    static async getSuggestions(_: IpcMainInvokeEvent) {
        console.log('Entered <AIChatController.getSuggestions>');

        // TODO: Implement

        console.log('Exited <AIChatController.getSuggestions>');
    }

    static async chat(_: IpcMainInvokeEvent) {
        console.log('Entered <AIChatController.chat>');

        // TODO: Implement

        console.log('Exited <AIChatController.chat>');
    }

}