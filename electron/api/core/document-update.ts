import { IpcMainInvokeEvent } from "electron/main";
import { z } from "zod";

/**
 * Schema for document update requests
 */
export const DocumentUpdateSchema = z.object({
  requestId: z.string(),
  documentId: z.string(),
  updateType: z.enum(["search_replace", "range_replace"]),
  searchText: z.string().optional(),
  replaceText: z.string().default(""),
  startPosition: z.number().optional(),
  endPosition: z.number().optional(),
  highlightChanges: z.boolean().default(true),
});

export type DocumentUpdateParams = z.infer<typeof DocumentUpdateSchema>;

/**
 * Handles document update requests
 * Supports two types of updates:
 * 1. Search and replace - Find text and replace it
 * 2. Range replace - Replace text within a specific character range
 */
export const updateDocument = async (_: IpcMainInvokeEvent, data: unknown) => {
  try {
    // Validate the request data
    const validatedData = await DocumentUpdateSchema.parseAsync(data);
    
    // Create a response object with the update details
    const response = {
      requestId: validatedData.requestId,
      documentId: validatedData.documentId,
      updateType: validatedData.updateType,
      success: true,
      changes: {
        original: validatedData.updateType === "search_replace" ? validatedData.searchText : "Range content",
        replacement: validatedData.replaceText,
        startPosition: validatedData.startPosition,
        endPosition: validatedData.endPosition,
      },
      highlightChanges: validatedData.highlightChanges,
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
