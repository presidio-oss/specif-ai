import { Injectable } from '@angular/core';
import { DocumentUpdateService } from '../../services/document-update/document-update.service';
import { ToasterService } from '../../services/toaster/toaster.service';

/**
 * Handler for document update tool responses
 * This service processes tool responses from the LLM and applies document updates
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentUpdateHandler {
  constructor(
    private documentUpdateService: DocumentUpdateService,
    private toasterService: ToasterService
  ) {}

  /**
   * Process a tool response and apply document updates if needed
   * @param toolResponse The tool response from the LLM
   * @param onContentUpdated Callback function to be called when content is updated
   * @param getCurrentContent Function to get the current content of the document
   * @returns True if the response was handled, false otherwise
   */
  public handleToolResponse(
    toolResponse: string, 
    onContentUpdated: (content: string) => void,
    getCurrentContent: () => string
  ): boolean {
    if (!toolResponse) return false;

    try {
      // Parse the tool response
      const response = JSON.parse(toolResponse);
      
      // Check if this is a document update response
      if (response.updateRequest) {
        const { updateRequest } = response;
        
        // Get the current content
        const currentContent = getCurrentContent();
        
        // Apply the update based on the update type
        if (updateRequest.updateType === 'text_block_replace') {
          this.handleTextBlockReplace(updateRequest, currentContent, onContentUpdated);
          return true;
        }
      }
    } catch (error) {
      console.error('Error handling tool response:', error);
    }
    
    return false;
  }

  /**
   * Handle a text block replace update
   * @param updateRequest The update request
   * @param currentContent The current content of the document
   * @param onContentUpdated Callback function to be called when content is updated
   */
  private handleTextBlockReplace(
    updateRequest: any, 
    currentContent: string,
    onContentUpdated: (content: string, replacementInfo?: { 
      searchBlock: string, 
      replaceBlock: string
    }) => void
  ): void {
    const { searchBlock, replaceBlock, documentId } = updateRequest;
    
    // Show a toast message with the update details
    this.toasterService.showInfo(`Replacing specific text block with new content.`);
    
    try {
      // Check if the search block exists in the content
      if (!currentContent.includes(searchBlock)) {
        this.toasterService.showWarning(`Text block not found in the document`);
        return;
      }
      
      // Replace the text block with the replacement block
      const updatedContent = currentContent.replace(searchBlock, replaceBlock);
      
      // Call the callback function with the updated content and replacement info
      onContentUpdated(updatedContent, {
        searchBlock,
        replaceBlock
      });
      
      // Show success message
      this.toasterService.showSuccess(`Successfully replaced text block`);
      
      // Apply the update using the document update service for tracking purposes
      this.documentUpdateService.applyUpdate({
        requestId: updateRequest.requestId,
        documentId,
        updateType: 'text_block_replace',
        searchBlock,
        replaceBlock
      });
    } catch (error) {
      console.error('Error replacing text block:', error);
      this.toasterService.showError(`Failed to replace text block: ${error}`);
    }
  }
}
