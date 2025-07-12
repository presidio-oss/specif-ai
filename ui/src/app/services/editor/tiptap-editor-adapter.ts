import { Injectable } from '@angular/core';
import { Editor } from '@tiptap/core';
import { EditorManager } from 'src/app/interfaces/editor-adapter.interface';
import { NGXLogger } from 'ngx-logger';

/**
 * TipTap Editor Adapter
 * 
 * This class implements the EditorAdapter interface for the TipTap editor,
 * allowing the inline edit component to work with any TipTap instance.
 */
@Injectable()
export class TiptapEditorAdapter implements EditorManager {
  private editor: Editor;
  private editorElement: HTMLElement;
  private selectionLocked: boolean = false;
  private selectionHighlighted: boolean = false;
  private selectionMarkers: Array<HTMLElement | null> = [];
  private activeSelection: { start: number, end: number, text: string } | null = null;
  
  // For cleanup
  private mousedownHandler: ((event: MouseEvent) => void) | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  private selectionChangeHandler: ((event: Event) => void) | null = null;

  constructor(
    editor: Editor,
    editorElement: HTMLElement,
    private logger: NGXLogger
  ) {
    this.editor = editor;
    this.editorElement = editorElement;
  }

  // EditorAdapter Implementation
  getSelectedText(): string {
    if (this.activeSelection && this.selectionLocked) {
      return this.activeSelection.text;
    }
    
    const { from, to } = this.editor.state.selection;
    if (from === to) return '';
    
    try {
      // Get the selection directly from window.getSelection() for more accuracy
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        // Use the browser's selection object which is more accurate for visible text
        return selection.toString().trim();
      }
    } catch (e) {
      this.logger.warn('Error getting selection from window, falling back to editor state');
    }
    
    // Fallback: Get the text with precise boundaries from editor state
    // Use empty string for boundaries to prevent adding spaces
    return this.editor.state.doc.textBetween(from, to, '', '');
  }

  getSelectionStart(): number {
    if (this.activeSelection && this.selectionLocked) {
      return this.activeSelection.start;
    }
    
    return this.editor.state.selection.from;
  }

  getSelectionEnd(): number {
    if (this.activeSelection && this.selectionLocked) {
      return this.activeSelection.end;
    }
    
    return this.editor.state.selection.to;
  }

  getContext(): string {
    return this.editor.getHTML();
  }

  setSelection(start: number, end: number): void {
    this.editor.commands.setTextSelection({
      from: start,
      to: end
    });
  }

  replaceSelection(content: string): void {
    // Get current state and content before making changes
    const currentContent = this.editor.getHTML();
    const { from, to } = this.editor.state.selection;
    
    // Check if the content contains HTML
    const containsHtml = /<[a-z][\s\S]*>/i.test(content);
    
    try {
      if (containsHtml) {
        // For HTML content, use the insertContent API
        this.editor.commands.setTextSelection({ from, to });
        this.editor.commands.deleteSelection();
        
        // Then carefully insert the HTML content
        this.editor.commands.insertContent(content, {
          parseOptions: {
            preserveWhitespace: 'full'
          }
        });
      } else {
        // For plain text, use transaction for more precise control
        this.editor.view.dispatch(
          this.editor.state.tr
            .deleteRange(from, to)
            .insertText(content, from)
        );
      }
    } catch (error) {
      // If anything goes wrong, log and restore
      this.logger.error('Error replacing selection:', error);
      
      // Safety restoration
      if (this.editor.getHTML() !== currentContent && !containsHtml) {
        this.editor.commands.setContent(currentContent);
        this.editor.commands.setTextSelection({ from, to });
      }
    }
  }

  highlightSelection(): void {
    try {
      // First, take a snapshot of the document before any changes
      const originalContent = this.editor.getHTML();
      
      // Get selection from the browser rather than the editor
      // This gives us the actual text the user sees rather than the model's representation
      let selectionText = '';
      let from = 0;
      let to = 0;
      
      // Try to get the exact selection from the browser
      const browserSelection = window.getSelection();
      if (browserSelection && browserSelection.toString().trim()) {
        selectionText = browserSelection.toString().trim();
        
        // We still need ProseMirror positions for operations
        const editorSelection = this.editor.state.selection;
        from = editorSelection.from;
        to = editorSelection.to;
        
        // Important: Store the exact browser selection content
        // This prevents extra lines/paragraphs from being selected
        this.activeSelection = {
          start: from,
          end: to,
          text: selectionText
        };
      } else {
        // Fallback to editor selection
        const editorSelection = this.editor.state.selection;
        from = editorSelection.from;
        to = editorSelection.to;
        selectionText = this.editor.state.doc.textBetween(from, to, '', '');
        
        this.activeSelection = {
          start: from,
          end: to,
          text: selectionText
        };
      }
      
      // Store complete document snapshot to restore exactly if needed
      if (this.editor.storage) {
        this.editor.storage['inlineEditOriginalContent'] = originalContent;
        this.editor.storage['inlineEditSelection'] = {
          from,
          to,
          text: selectionText,
          originalSelection: this.activeSelection
        };
      }
      
      // Apply highlighting class to the whole editor
      this.editorElement.classList.add('inline-edit-active');
      
      // Apply highlighting with CSS only - not affecting the document model
      // IMPORTANT: Use the browser selection for visualization
      this.createVisualHighlight(browserSelection);
      
      this.selectionHighlighted = true;
    } catch (error) {
      this.logger.error('Error highlighting text in TipTap adapter:', error);
    }
  }

  removeHighlight(): void {
    try {
      // Get original content from storage if available (most reliable)
      let originalContent = this.editor.getHTML();
      let originalSelection = {
        from: this.editor.state.selection.from,
        to: this.editor.state.selection.to
      };
      
      if (this.editor.storage && this.editor.storage['inlineEditOriginalContent']) {
        originalContent = this.editor.storage['inlineEditOriginalContent'];
      }
      
      // First remove visual elements only (no content modification)
      this.editorElement.classList.remove('inline-edit-active');
      this.cleanupOverlayElements();
      
      // Reset state flags
      this.selectionHighlighted = false;
      
      // Check if content was somehow modified during the process
      const currentContent = this.editor.getHTML();
      if (currentContent !== originalContent) {
        this.logger.warn('Content was modified, restoring original content');
        
        // Restore the original content
        this.editor.commands.setContent(originalContent);
        
        // Restore selection after a short delay to ensure content is fully updated
        setTimeout(() => {
          if (this.activeSelection) {
            this.editor.commands.setTextSelection({
              from: this.activeSelection.start,
              to: this.activeSelection.end
            });
          }
        }, 10);
      }
    } catch (error) {
      this.logger.error('Error removing highlight in TipTap adapter:', error);
    }
  }

  focus(): void {
    this.editor.commands.focus();
  }

  getEditorElement(): HTMLElement {
    return this.editorElement;
  }

  calculatePopupPosition(): { top: number, left: number } {
    try {
      const selection = window.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = this.editorElement.getBoundingClientRect();
        
        return {
          top: rect.bottom - editorRect.top,
          left: rect.left - editorRect.left + (rect.width / 2)
        };
      }
      
      // Fallback position
      return { top: 100, left: 100 };
    } catch (error) {
      this.logger.error('Error calculating popup position:', error);
      return { top: 100, left: 100 };
    }
  }

  // SelectionLockHandler Implementation
  lockSelection(): void {
    if (this.selectionLocked) return;
    
    // Store current selection
    const { from, to } = this.editor.state.selection;
    if (from === to) return; // Don't lock if no selection
    
    this.activeSelection = {
      start: from,
      end: to,
      text: this.editor.state.doc.textBetween(from, to)
    };
    
    // Set up handlers for mouse and keyboard events
    this.setupEventHandlers();
    
    // Highlight the selection to show it's locked
    this.highlightSelection();
    
    this.selectionLocked = true;
  }

  unlockSelection(): void {
    if (!this.selectionLocked) return;
    
    // Remove all event handlers
    this.removeEventHandlers();
    
    // Remove highlighting
    this.removeHighlight();
    
    // Reset state
    this.activeSelection = null;
    this.selectionLocked = false;
  }

  isSelectionLocked(): boolean {
    return this.selectionLocked;
  }

  getEditorInstance(): any {
    return this.editor;
  }

  // Private helper methods
  private setupEventHandlers(): void {
    // Selection change handler
    this.selectionChangeHandler = this.preventSelectionClear.bind(this);
    document.addEventListener('selectionchange', this.selectionChangeHandler);
    
    // Mouse down handler
    this.mousedownHandler = this.handleMouseDown.bind(this);
    this.editor.view.dom.addEventListener('mousedown', this.mousedownHandler);
    
    // Keyboard handler
    this.keydownHandler = this.handleKeyDown.bind(this);
    this.editor.view.dom.addEventListener('keydown', this.keydownHandler);
  }

  private removeEventHandlers(): void {
    if (this.selectionChangeHandler) {
      document.removeEventListener('selectionchange', this.selectionChangeHandler);
      this.selectionChangeHandler = null;
    }
    
    if (this.mousedownHandler) {
      this.editor.view.dom.removeEventListener('mousedown', this.mousedownHandler);
      this.mousedownHandler = null;
    }
    
    if (this.keydownHandler) {
      this.editor.view.dom.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  private preventSelectionClear(e: Event): void {
    if (this.selectionLocked && this.activeSelection) {
      if (!this.selectionHighlighted) {
        this.highlightSelection();
      }
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.selectionLocked || !this.activeSelection) return;
    
    // Check if click is inside an inline edit component
    const target = event.target as HTMLElement;
    const clickedOnInlineEdit = target.closest('app-inline-edit') !== null;
    
    if (!clickedOnInlineEdit) {
      // Prevent new selection
      event.preventDefault();
      event.stopPropagation();
      
      // Restore locked selection
      this.setSelection(this.activeSelection.start, this.activeSelection.end);
      this.highlightSelection();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.selectionLocked || !this.activeSelection) return;
    
    // Check if input is inside an inline edit component
    const target = event.target as HTMLElement;
    const keyInInlineEdit = target.closest('app-inline-edit') !== null;
    
    if (keyInInlineEdit) return;
    
    // List of keys that could change selection
    const selectionKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown'
    ];
    
    if (event.shiftKey || selectionKeys.includes(event.key)) {
      // Prevent keyboard-based selection changes
      event.preventDefault();
      event.stopPropagation();
      
      // Restore locked selection
      this.setSelection(this.activeSelection.start, this.activeSelection.end);
      this.highlightSelection();
    }
  }

  // CSS class name prefix for all elements created by this adapter
  private readonly CLASS_PREFIX = 'editor-selection';

  private createVisualHighlight(browserSelection?: Selection | null): void {
    try {
      // Create or find overlay container using a generic class name
      const containerClass = `${this.CLASS_PREFIX}-container`;
      let overlayContainer = this.editorElement.querySelector(`.${containerClass}`) as HTMLElement;
      if (!overlayContainer) {
        overlayContainer = document.createElement('div');
        overlayContainer.className = containerClass;
        overlayContainer.style.position = 'relative';
        overlayContainer.style.pointerEvents = 'none';
        overlayContainer.style.zIndex = '1000';
        this.editorElement.appendChild(overlayContainer);
      }
      
      // Clear existing overlays
      while (overlayContainer.firstChild) {
        overlayContainer.removeChild(overlayContainer.firstChild);
      }
      
      // Create highlight element with generic class name
      const selectionEl = document.createElement('div');
      selectionEl.className = `${this.CLASS_PREFIX}-highlight`;
      selectionEl.style.position = 'absolute';
      selectionEl.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
      selectionEl.style.borderBottom = '1px dotted rgba(59, 130, 246, 0.7)';
      selectionEl.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
      selectionEl.style.pointerEvents = 'none';
      selectionEl.style.zIndex = '50';
      
      // Position over selection - use the provided browser selection when available
      // This is more accurate than getting a new selection which might have changed
      const selection = browserSelection || window.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        // IMPORTANT: Create a range clone from the browser selection
        // This prevents the selection from being extended at paragraph boundaries
        const range = selection.getRangeAt(0).cloneRange();
        
        // Get the exact visual rectangle of the browser selection
        const rect = range.getBoundingClientRect();
        const editorRect = this.editorElement.getBoundingClientRect();
        
        // Set the position and size of our highlight element to match the browser selection
        selectionEl.style.top = `${rect.top - editorRect.top}px`;
        selectionEl.style.left = `${rect.left - editorRect.left}px`;
        selectionEl.style.width = `${rect.width}px`;
        selectionEl.style.height = `${rect.height}px`;
      }
      
      // Add to container
      overlayContainer.appendChild(selectionEl);
      
      // Store for cleanup
      this.selectionMarkers.push(selectionEl);
    } catch (error) {
      this.logger.warn('Error creating overlay highlight:', error);
    }
  }

  private highlightTextNodesInRange(): void {
    if (!this.activeSelection) return;
    
    try {
      // Instead of operating on text nodes directly, use TipTap's mark functionality
      // for a cleaner, more reliable approach
      this.editor.commands.setTextSelection({
        from: this.activeSelection.start,
        to: this.activeSelection.end
      });
      
      // Apply a highlight mark with our custom class
      this.editor.commands.setMark('highlight', { 
        class: `${this.CLASS_PREFIX}-node` 
      });
      
      // No need to track individual elements for cleanup - we can just remove the mark later
      const highlightedElements: HTMLElement[] = [];
      
      // Store for cleanup
      this.selectionMarkers.push(...highlightedElements);
    } catch (error) {
      this.logger.warn('Error highlighting text nodes:', error);
    }
  }

  private cleanupOverlayElements(): void {
    try {
      // Find and remove overlay container using our prefix
      const overlayContainer = this.editorElement.querySelector(`.${this.CLASS_PREFIX}-container`);
      if (overlayContainer && overlayContainer.parentNode) {
        overlayContainer.parentNode.removeChild(overlayContainer);
      }
    } catch (error) {
      this.logger.error('Error cleaning up overlay elements:', error);
    }
  }

  private cleanupTextNodeHighlights(): void {
    try {
      // Instead of manipulating DOM directly, use TipTap's API to remove marks
      // This is much safer and avoids accidental text deletion
      this.editor.commands.unsetMark('highlight');
      
      // Clear our selection markers array
      this.selectionMarkers = [];
      
      // Remove any additional inline-edit classes from the editor
      this.editorElement.classList.remove('inline-edit-active');
      
      // Create an array of both generic and legacy class names
      const highlightClasses = [
        `.${this.CLASS_PREFIX}-node`,
        `.${this.CLASS_PREFIX}-highlight`,
        // For backward compatibility
        '.inline-edit-selection',
        '.inline-edit-selection-persistent',
        '.inline-edit-selection-node',
        '.inline-edit-selection-overlay'
      ];
      
      // Only if TipTap's unsetMark didn't work, carefully remove DOM elements
      highlightClasses.forEach(className => {
        const elements = this.editorElement.querySelectorAll(className);
        elements.forEach((el: Element) => {
          if (el.parentNode) {
            // IMPORTANT: Make a copy of children first to avoid iteration issues
            const children = Array.from(el.childNodes);
            // Then append each child to parent before removing the element
            children.forEach(child => el.parentNode!.insertBefore(child, el));
            // Finally remove the empty element
            el.parentNode.removeChild(el);
          }
        });
      });
    } catch (error) {
      this.logger.error('Error cleaning up text node highlights:', error);
    }
  }

  /**
   * Dispose of this adapter, cleaning up all references and event listeners
   */
  dispose(): void {
    this.removeEventHandlers();
    this.removeHighlight();
    this.activeSelection = null;
    this.selectionLocked = false;
    this.selectionHighlighted = false;
  }
}
