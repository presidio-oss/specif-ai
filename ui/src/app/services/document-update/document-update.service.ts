import { Injectable } from '@angular/core';
import { ToasterService } from '../toaster/toaster.service';

/**
 * Service for handling document updates
 * Provides methods for searching and replacing text in documents
 * Handles processing of tool responses and applying document updates
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentUpdateService {
  constructor(
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
    onContentUpdated: (content: string, replacementInfo?: any) => void,
    getCurrentContent: () => string
  ): boolean {
    if (!toolResponse) return false;

    try {
      const response = toolResponse as any;
      
      if (response.updateRequest) {
        const { updateRequest } = response;
        
        const currentContent = getCurrentContent();
        
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
    const { searchBlock, replaceBlock } = updateRequest;
    
    this.toasterService.showInfo(`Updating specific content in the document`);
    
    try {
      if (!currentContent.includes(searchBlock)) {
        this.toasterService.showWarning(`Text block not found in the document`);
        return;
      }
      
      const updatedContent = currentContent.replace(searchBlock, replaceBlock);
      
      onContentUpdated(updatedContent, {
        searchBlock,
        replaceBlock
      });
      
      this.toasterService.showSuccess(`Successfully updated document content`);
    
    } catch (error) {
      console.error('Error replacing text block:', error);
      this.toasterService.showError(`Failed to update document content: ${error}`);
    }
  }
}
