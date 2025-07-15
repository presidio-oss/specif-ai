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
    const validatedData = await DocumentUpdateSchema.parseAsync(data);
    
    if (!validatedData) {
      throw new Error("Invalid data format for document update");
    }

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
    
    return response;
  } catch (error) {
    console.error('[update-document] error', error);
    
    throw error;
  }
};
