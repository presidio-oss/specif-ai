import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Editor } from '@tiptap/core';
import { ElementRef } from '@angular/core';
import { TiptapEditorAdapter } from '../editor/tiptap-editor-adapter';
import { EditorManager } from 'src/app/interfaces/editor-adapter.interface';
import { InlineEditService } from './inline-edit.service';

/**
 * InlineEditManager Service
 * 
 * This service creates and manages editor adapters for different editors,
 * making the inline edit component reusable across different editors.
 */
@Injectable({
  providedIn: 'root'
})
export class InlineEditManagerService {
  
  constructor(
    private logger: NGXLogger,
    private inlineEditService: InlineEditService
  ) {}
  
  /**
   * Create a TipTap editor adapter
   * 
   * @param editor The TipTap editor instance
   * @param elementRef ElementRef to the editor's DOM element
   * @returns An EditorManager instance that can be used with the inline edit component
   */
  createTipTapAdapter(editor: Editor, elementRef: ElementRef): EditorManager {
    if (!editor || !elementRef?.nativeElement) {
      throw new Error('Invalid editor or element reference provided to adapter');
    }
    
    try {
      return new TiptapEditorAdapter(
        editor, 
        elementRef.nativeElement as HTMLElement,
        this.logger
      );
    } catch (error) {
      this.logger.error('Error creating TipTap adapter:', error);
      throw error;
    }
  }
  
  /**
   * Dispose of an editor adapter
   * 
   * @param adapter The adapter to dispose of
   */
  disposeAdapter(adapter: EditorManager): void {
    if (adapter instanceof TiptapEditorAdapter) {
      adapter.dispose();
    }
  }
}
