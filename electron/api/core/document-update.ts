import { IpcMainInvokeEvent } from "electron/main";
import { z } from "zod";

/**
 * Schema for document update requests
 */
export const DocumentUpdateSchema = z.object({
  requestId: z.string(),
  documentId: z.string(),
  updateType: z.enum(["text_block_replace"]),
  searchBlock: z.string(),
  replaceBlock: z.string()
});

export type DocumentUpdateParams = z.infer<typeof DocumentUpdateSchema>;

/**
 * Handles document update requests
 * Supports text block replace - Replace a specific block of text with another block
 */
export const updateDocument = async (_: IpcMainInvokeEvent, data: unknown) => {
  try {
    // Validate the request data
    const validatedData = await DocumentUpdateSchema.parseAsync(data);
    
    // Create a response object with the update details
    const changes = {
      searchBlock: validatedData.searchBlock,
      replaceBlock: validatedData.replaceBlock
    };
    
    const response = {
      requestId: validatedData.requestId,
      documentId: validatedData.documentId,
      updateType: validatedData.updateType,
      success: true,
      changes
    };
    
    // Send an event with the update details to the UI
    _.sender.send(`document:${validatedData.requestId}-update`, response);
    
    return response;
  } catch (error) {
    console.error('[update-document] error', error);
    
    // Send an error event to the UI
    _.sender.send(`document:${(data as any)?.requestId}-update`, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
};
