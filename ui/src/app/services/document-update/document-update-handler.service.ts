import { Injectable } from '@angular/core';
import { DocumentUpdateService } from './document-update.service';
import { ToasterService } from '../toaster/toaster.service';

/**
 * Handler for document update tool responses
 * This service processes tool responses from the LLM and applies document updates
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentUpdateHandlerService {
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
    onContentUpdated: (content: string, replacementInfo?: any) => void,
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
        if (updateRequest.updateType === 'search_replace') {
          this.handleSearchReplace(updateRequest, currentContent, onContentUpdated);
          return true;
        } else if (updateRequest.updateType === 'range_replace') {
          this.handleRangeReplace(updateRequest, currentContent, onContentUpdated);
          return true;
        }
      }
    } catch (error) {
      console.error('Error handling tool response:', error);
    }
    
    return false;
  }

  /**
   * Handle a search and replace update
   * @param updateRequest The update request
   * @param currentContent The current content of the document
   * @param onContentUpdated Callback function to be called when content is updated
   */
  private handleSearchReplace(
    updateRequest: any, 
    currentContent: string,
    onContentUpdated: (content: string, replacementInfo?: { 
      searchText: string, 
      replaceText: string,
      positions: number[] 
    }) => void
  ): void {
    const { searchText, replaceText, documentId, highlightChanges } = updateRequest;
    
    // Show a toast message with the update details
    this.toasterService.showInfo(`Replacing "${searchText}" with "${replaceText}"`);
    
    try {
      // Find all occurrences of the search text to get positions
      const positions: number[] = [];
      const regex = new RegExp(this.escapeRegExp(searchText), 'g');
      let match;
      
      while ((match = regex.exec(currentContent)) !== null) {
        positions.push(match.index);
      }
      
      if (positions.length === 0) {
        this.toasterService.showWarning(`Text "${searchText}" not found in the document`);
        return;
      }
      
      // Check if this is a heading (starts with # or has ## pattern)
      const isHeading = searchText.trim().startsWith('#') || /^#+\s+/.test(searchText.trim());
      
      // Initialize updatedContent with the current content
      let updatedContent: string = currentContent;
      
      if (isHeading && positions.length > 1 && replaceText === '') {
        // For headings with multiple occurrences and empty replaceText (deletion),
        // only remove all but the first occurrence
        console.log('[DocumentUpdateHandlerService] Detected heading removal with multiple occurrences, preserving one instance');
                
        // Start from the second occurrence (index 1)
        for (let i = 1; i < positions.length; i++) {
          const pos = positions[i];
          const beforeMatch = updatedContent.substring(0, pos);
          const afterMatch = updatedContent.substring(pos + searchText.length);
          updatedContent = beforeMatch + replaceText + afterMatch;
        }
      } else {
        // For non-headings or single occurrences, replace all occurrences
        updatedContent = currentContent.replace(
          new RegExp(this.escapeRegExp(searchText), 'g'), 
          replaceText
        );
      }
      
      // Call the callback function with the updated content and replacement info
      onContentUpdated(updatedContent, {
        searchText,
        replaceText,
        positions
      });
      
      // Show success message
      this.toasterService.showSuccess(`Successfully replaced "${searchText}" with "${replaceText}"`);
      
      // Apply the update using the document update service for tracking purposes
      this.documentUpdateService.searchAndReplace(
        documentId,
        searchText,
        replaceText,
        highlightChanges
      );
    } catch (error) {
      console.error('Error replacing text:', error);
      this.toasterService.showError(`Failed to replace text: ${error}`);
    }
  }
  
  /**
   * Escape special characters in a string for use in a regular expression
   * @param string The string to escape
   * @returns The escaped string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Handle a range replace update
   * @param updateRequest The update request
   * @param currentContent The current content of the document
   * @param onContentUpdated Callback function to be called when content is updated
   */
  private handleRangeReplace(
    updateRequest: any, 
    currentContent: string,
    onContentUpdated: (content: string, replacementInfo?: { 
      startPosition: number, 
      endPosition: number,
      replaceText: string 
    }) => void
  ): void {
    const { startPosition, endPosition, replaceText, documentId, highlightChanges } = updateRequest;
    
    // Show a toast message with the update details
    this.toasterService.showInfo(`Replacing text at positions ${startPosition}-${endPosition}`);
    
    try {
      // Replace the text within the specified range
      const updatedContent = 
        currentContent.substring(0, startPosition) + 
        replaceText + 
        currentContent.substring(endPosition);
      
      // Call the callback function with the updated content and replacement info
      onContentUpdated(updatedContent, {
        startPosition,
        endPosition,
        replaceText
      });
      
      // Show success message
      this.toasterService.showSuccess(`Successfully replaced text at positions ${startPosition}-${endPosition}`);
      
      // Apply the update using the document update service for tracking purposes
      this.documentUpdateService.replaceRange(
        documentId,
        startPosition,
        endPosition,
        replaceText,
        highlightChanges
      );
    } catch (error) {
      console.error('Error replacing text range:', error);
      this.toasterService.showError(`Failed to replace text range: ${error}`);
    }
  }
}
