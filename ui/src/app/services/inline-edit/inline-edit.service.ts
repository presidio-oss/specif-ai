import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ToasterService } from '../toaster/toaster.service';
import { InlineEditPromptComponent } from '../../components/inline-edit-prompt/inline-edit-prompt.component';
import { Observable, Subject } from 'rxjs';
import { InlineEditResponse } from '../../model/interfaces/chat.interface';
import { v4 as uuidv4 } from 'uuid';
import { markdownToHtml } from '../../utils/markdown.utils';

@Injectable({
  providedIn: 'root'
})
export class InlineEditService {
  private editResultSubject = new Subject<InlineEditResponse | null>();
  public editResult$ = this.editResultSubject.asObservable();
  public isPromptOpen = false;
  
  constructor(
    private dialog: MatDialog,
    private electronService: ElectronService,
    private toasterService: ToasterService
  ) {}
  
  /**
   * Opens the prompt dialog for inline editing
   * @param selectedText The text that was selected by the user
   * @param context Optional context for the AI to consider when editing
   */
  openPromptDialog(selectedText: string, context?: string): void {
    this.isPromptOpen = true;
    
    // Open dialog with initial prompt state
    const dialogRef = this.dialog.open(InlineEditPromptComponent, {
      width: '500px',
      data: { 
        selectedText, 
        context,
        // Pass reference to process function so component can handle state transitions
        processFunction: (prompt: string) => this.processInlineEdit(selectedText, prompt, context)
      },
      panelClass: 'inline-edit-dialog',
      disableClose: true
    });
    
    // Handle dialog close
    dialogRef.afterClosed().subscribe(result => {
      this.isPromptOpen = false;
      
      if (result && result.accepted) {
        // User accepted the edit
        const response: InlineEditResponse = {
          requestId: uuidv4(),
          editedText: result.editedText,
          success: true
        };
        this.editResultSubject.next(response);
      } else {
        // User cancelled or rejected
        this.editResultSubject.next(null);
      }
    });
  }
  
  /**
   * Process the inline edit request with the AI
   * This is called from the component directly
   * @param selectedText The text selected by the user
   * @param userPrompt The prompt provided by the user
   * @param context Optional context for the AI
   * @returns Promise with the AI response
   */
  async processInlineEdit(
    selectedText: string, 
    userPrompt: string, 
    context?: string
  ): Promise<InlineEditResponse> {
    try {
      // Generate a unique request ID
      const requestId = uuidv4();
      
      // Call the electron service to process the inline edit
      const response = await this.electronService.inlineEditWithAI({
        requestId,
        selectedText,
        userPrompt,
        context,
        preserveFormatting: true
      });
      
      // Ensure markdown formatting is preserved in the response
      if (response.success && response.editedText) {
        // The response is already in markdown format, so we return it as-is
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('Error processing inline edit:', error);
      return {
        requestId: uuidv4(),
        editedText: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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
          console.warn('Failed to parse as HTML, inserting as plain text', e);
          editor.commands.insertContent(editedText);
        }
      }
      
      // Return the updated content
      return editor.getHTML();
    } catch (error) {
      console.error('Error applying inline edit:', error);
      return '';
    }
  }
}
