import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable, Subject } from 'rxjs';
import { ElectronService } from 'src/app/electron-bridge/electron.service';
import { InlineEditPayload } from 'src/app/model/interfaces/chat.interface';
import { markdownToHtml } from 'src/app/utils/markdown.utils';
import { v4 as uuidv4 } from 'uuid';

export interface InlineEditStreamEvent {
  type: 'start' | 'chunk' | 'end' | 'error';
  content?: string;
  error?: string;
  isComplete?: boolean;
}

/**
 * Service for handling inline text editing with AI
 * This service provides methods for requesting AI-powered text edits
 * and handling the streaming responses
 */
@Injectable({
  providedIn: 'root'
})
export class InlineEditService {
  
  constructor(
    private electronService: ElectronService,
    private logger: NGXLogger
  ) {}
  
  /**
   * Request an inline edit for the selected text
   * @param selectedText The text to edit
   * @param userPrompt The user's instructions for the AI
   * @param context Optional context for the edit (e.g., surrounding text)
   * @param selectionStart Optional start position of the selection
   * @param selectionEnd Optional end position of the selection
   * @returns An observable that emits streaming events for the edit process
   */
  requestInlineEdit(
    selectedText: string,
    userPrompt: string,
    context?: string,
    selectionStart?: number,
    selectionEnd?: number
  ): Observable<InlineEditStreamEvent> {
    const subject = new Subject<InlineEditStreamEvent>();
    const requestId = uuidv4();
    
    // Create payload according to InlineEditPayload interface
    const payload: InlineEditPayload = {
      requestId,
      selectedText,
      userPrompt,
      context,
      preserveFormatting: false
    };
    
    // Set up streaming response handler
    let suggestedText = '';
    
    const streamHandler = (_: any, event: any) => {
      switch(event.event) {
        // When the chat model starts
        case "on_chat_model_start": {
          if(event["metadata"]["langgraph_node"] === "llm") {
            subject.next({ type: 'start' });
          }
          break;
        }
        
        // When the chat model streams a chunk of data
        case 'on_chat_model_stream': {
          const chunk = event.data.chunk;
          
          if(chunk.content && event["metadata"]?.["langgraph_node"] === "llm") {
            // Append the chunk content to our suggested text
            suggestedText += chunk.content;
            
            // Emit the chunk
            subject.next({ 
              type: 'chunk',
              content: chunk.content
            });
          }
          break;
        }
        
        // When the chat model ends
        case 'on_chat_model_end': {
          if(event.metadata.langgraph_node === "llm") {
            // Emit the complete result
            subject.next({ 
              type: 'end',
              content: suggestedText,
              isComplete: true
            });
          }
          break;
        }
      }
    };
    
    // Register stream handler
    this.electronService.listenChatEvents(requestId, streamHandler);
    
    // Initiate chat
    this.electronService.inlineEditWithAI(payload)
      .then((response) => {
        // Handle the response as a fallback in case streaming doesn't work
        if (suggestedText === '' && response) {
          this.logger.debug('Received inline edit response from Promise:', response);
          
          // Emit the complete result
          subject.next({ 
            type: 'end',
            content: response.editedText,
            isComplete: true
          });
        }
        
        // Complete the observable
        subject.complete();
      })
      .catch((error) => {
        this.logger.error('Error requesting inline edit:', error);
        
        // Emit the error
        subject.next({ 
          type: 'error',
          error: error.message || 'Failed to get a response from the AI'
        });
        
        // Complete the observable
        subject.complete();
      })
      .finally(() => {
        // Clean up by removing the listener
        this.electronService.removeChatListener(requestId, streamHandler);
      });
    
    return subject.asObservable();
  }
  
  /**
   * Apply an inline edit to the text
   * @param editor The editor instance
   * @param editedText The edited text to apply
   * @param selectionStart The start position of the selection
   * @param selectionEnd The end position of the selection
   * @returns The updated content
   */
  applyInlineEdit(editor: any, editedText: string, selectionStart: number, selectionEnd: number): string {
    if (!editor) return '';
    
    try {
      // Set the selection
      editor.commands.setTextSelection({
        from: selectionStart,
        to: selectionEnd
      });
      
      // Check if the edited text contains HTML tags
      const containsHtml = /<[a-z][\s\S]*>/i.test(editedText);
      
      // Replace the selection with the edited text
      editor.commands.deleteSelection();
      
      if (containsHtml) {
        // If it contains HTML, use insertContent with parseOptions to parse HTML
        editor.commands.insertContent(editedText, {
          parseOptions: {
            preserveWhitespace: 'full'
          }
        });
      } else {
        // If it's markdown or plain text, convert it to HTML using the utility
        try {
          // Use the existing markdownToHtml utility
          const html = markdownToHtml(editedText);
          editor.commands.insertContent(html, {
            parseOptions: {
              preserveWhitespace: 'full'
            }
          });
        } catch (e) {
          // Fallback to inserting as plain text
          this.logger.warn('Failed to parse as HTML, inserting as plain text', e);
          editor.commands.insertContent(editedText);
        }
      }
      
      // Return the updated content
      return editor.getHTML();
    } catch (error) {
      this.logger.error('Error applying inline edit:', error);
      return '';
    }
  }
  
}
