import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ElectronService } from '../../electron-bridge/electron.service';
import { InlineEditPromptComponent } from '../../components/inline-edit-prompt/inline-edit-prompt.component';
import { Subject } from 'rxjs';
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
  ) {}
  
  /**
   * Opens the prompt dialog for inline editing
   * @param selectedText The text that was selected by the user
   * @param context Optional context for the AI to consider when editing
   */
  openPromptDialog(selectedText: string, context?: string): void {
    this.isPromptOpen = true;

    const dialogRef = this.dialog.open(InlineEditPromptComponent, {
      width: '480px',
      maxWidth: '90vw',
      data: { 
        selectedText, 
        context,
        processFunction: (prompt: string) => this.processInlineEdit(selectedText, prompt, context)
      },
      panelClass: 'inline-edit-dialog',
      disableClose: true,
      backdropClass: 'inline-edit-backdrop',
      autoFocus: true,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      this.isPromptOpen = false;

      if (result && result.accepted) {
        const response: InlineEditResponse = {
          requestId: uuidv4(),
          editedText: result.editedText,
          success: true
        };
        this.editResultSubject.next(response);
      } else {
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
      const requestId = uuidv4();

      const response = await this.electronService.inlineEditWithAI({
        requestId,
        selectedText,
        userPrompt,
        context,
        preserveFormatting: true
      });

      if (response.success && response.editedText) {
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
   * @returns The edited text that was inserted
   */
  applyInlineEdit(editor: any, editedText: string, selectionStart: number, selectionEnd: number): string {
    if (!editor) return '';

    try {
      editor.commands.setTextSelection({
        from: selectionStart,
        to: selectionEnd
      });

      const containsHtml = /<[a-z][\s\S]*>/i.test(editedText);

      editor.chain().focus().deleteSelection().run();

      if (containsHtml) {
        editor.commands.insertContent(editedText, {
          parseOptions: {
            preserveWhitespace: 'full'
          }
        });
      } else {
        try {
          const html = markdownToHtml(editedText);
          editor.commands.insertContent(html, {
            parseOptions: {
              preserveWhitespace: 'full'
            }
          });
        } catch (e) {
          console.warn('Failed to parse as HTML, inserting as plain text', e);
          editor.commands.insertText(editedText);
        }
      }

      return editedText;
    } catch (error) {
      console.error('Error applying inline edit:', error);
      return '';
    }
  }
}
