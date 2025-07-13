import { Directive, ElementRef, HostListener, Inject, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { v4 as uuidv4 } from 'uuid';
import { Subject, fromEvent, takeUntil } from 'rxjs';
import { InlineEditService } from '../../services/inline-edit/inline-edit.service';
import { DOCUMENT } from '@angular/common';
import { InlineEditResponse } from '../../model/interfaces/chat.interface';
import { markdownToHtml } from '../../utils/markdown.utils';

/**
 * Directive that adds inline edit functionality to elements
 * This allows users to select text, click a sparkle icon, and edit the text with AI assistance
 */
@Directive({
  selector: '[appInlineEdit]',
  standalone: true
})
export class InlineEditDirective implements OnInit, OnDestroy {
  @Input() contextProvider?: () => string;
  @Input() onContentUpdated?: (newContent: string) => void;
  @Input() editable = true;
  @Input() editorInstance?: any; // Input for the editor instance
  
  private sparkleIcon: HTMLElement | null = null;
  private selection: Selection | null = null;
  private selectedText: string = '';
  private selectionRange: Range | null = null;
  private destroy$ = new Subject<void>();
  private lastSelectionPosition = { x: 0, y: 0 };
  
  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private electronService: ElectronService,
    private toasterService: ToasterService,
    private inlineEditService: InlineEditService,
    @Inject(DOCUMENT) private document: Document
  ) {}
  
  ngOnInit(): void {
    // Add event listener for mouseup to detect text selection
    fromEvent(this.el.nativeElement, 'mouseup')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.handleTextSelection(event as MouseEvent));
      
    // Add event listener for keyup to detect text selection via keyboard
    fromEvent(this.el.nativeElement, 'keyup')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.handleTextSelection());
    
    // Listen for clicks outside to hide the sparkle icon
    fromEvent(this.document, 'mousedown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: Event) => {
        if (
          this.sparkleIcon && 
          !this.sparkleIcon.contains(event.target as Node) &&
          event.target !== this.sparkleIcon
        ) {
          this.hideSparkleIcon();
        }
      });
      
    // Subscribe to the inline edit service's edit result
    this.inlineEditService.editResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: InlineEditResponse | null) => {
        if (result && this.selectionRange) {
          this.applyEdit(result.editedText);
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.hideSparkleIcon();
  }
  
  @HostListener('blur')
  onBlur(): void {
    // Hide the sparkle icon when the element loses focus
    setTimeout(() => {
      if (!this.inlineEditService.isPromptOpen) {
        this.hideSparkleIcon();
      }
    }, 200);
  }
  
  /**
   * Handle text selection events
   * @param event Optional MouseEvent if triggered by mouse
   */
  private handleTextSelection(event?: MouseEvent): void {
    if (!this.editable) return;
    
    this.selection = window.getSelection();
    
    if (this.selection && this.selection.toString().trim() !== '') {
      this.selectedText = this.selection.toString();
      this.selectionRange = this.selection.getRangeAt(0);
      
      // Check if selection is within this element
      if (this.selectionRange && this.el.nativeElement.contains(this.selectionRange.commonAncestorContainer)) {
        // Store the selection position for placing the icon
        try {
          const rect = this.selectionRange.getBoundingClientRect();
          if (rect) {
            this.lastSelectionPosition = {
              x: rect.right,
              y: rect.top
            };
          }
        } catch (e) {
          console.warn('Could not get selection rectangle', e);
        }
        
        // If triggered by mouse event, use that position instead
        if (event) {
          this.lastSelectionPosition = {
            x: event.clientX,
            y: event.clientY
          };
        }
        
        this.showSparkleIcon();
      } else {
        this.hideSparkleIcon();
      }
    } else {
      this.hideSparkleIcon();
    }
  }
  
  /**
   * Show the sparkle icon near the selected text
   */
  private showSparkleIcon(): void {
    if (this.sparkleIcon) {
      this.hideSparkleIcon();
    }
    
    // Create a simple div for the sparkle icon
    this.sparkleIcon = this.renderer.createElement('div');
    this.renderer.addClass(this.sparkleIcon, 'sparkle-icon');
    this.renderer.setStyle(this.sparkleIcon, 'position', 'fixed');
    this.renderer.setStyle(this.sparkleIcon, 'z-index', '1000');
    this.renderer.setStyle(this.sparkleIcon, 'cursor', 'pointer');
    this.renderer.setStyle(this.sparkleIcon, 'background-color', '#f0f9ff');
    this.renderer.setStyle(this.sparkleIcon, 'border', '1px solid #bfdbfe');
    this.renderer.setStyle(this.sparkleIcon, 'border-radius', '50%');
    this.renderer.setStyle(this.sparkleIcon, 'width', '28px');
    this.renderer.setStyle(this.sparkleIcon, 'height', '28px');
    this.renderer.setStyle(this.sparkleIcon, 'display', 'flex');
    this.renderer.setStyle(this.sparkleIcon, 'align-items', 'center');
    this.renderer.setStyle(this.sparkleIcon, 'justify-content', 'center');
    this.renderer.setStyle(this.sparkleIcon, 'box-shadow', '0 2px 4px rgba(0,0,0,0.1)');
    this.renderer.setStyle(this.sparkleIcon, 'font-size', '16px');
    
    // Calculate position (offset from selection)
    this.renderer.setStyle(this.sparkleIcon, 'left', `${this.lastSelectionPosition.x + 10}px`);
    this.renderer.setStyle(this.sparkleIcon, 'top', `${this.lastSelectionPosition.y - 30}px`);
    
    // Use a sparkle emoji as the icon
    this.renderer.setProperty(this.sparkleIcon, 'innerHTML', '✨');
    
    // Add click event to the sparkle icon
    if (this.sparkleIcon) {
      this.sparkleIcon.addEventListener('click', () => {
        this.openInlineEditPrompt();
      });
    }
    
    // Add tooltip attribute
    if (this.sparkleIcon) {
      this.renderer.setAttribute(this.sparkleIcon, 'title', 'Edit with AI');
    }
    
    // Add to body
    if (this.sparkleIcon) {
      this.renderer.appendChild(this.document.body, this.sparkleIcon);
      
      // Add animation
      this.renderer.setStyle(this.sparkleIcon, 'transform', 'scale(0)');
      this.renderer.setStyle(this.sparkleIcon, 'transition', 'transform 0.2s ease-out');
    }
    
    setTimeout(() => {
      if (this.sparkleIcon) {
        this.renderer.setStyle(this.sparkleIcon, 'transform', 'scale(1)');
      }
    }, 10);
  }
  
  /**
   * Hide the sparkle icon
   */
  private hideSparkleIcon(): void {
    if (this.sparkleIcon && this.sparkleIcon.parentNode) {
      this.sparkleIcon.parentNode.removeChild(this.sparkleIcon);
      this.sparkleIcon = null;
    }
  }
  
  /**
   * Open the inline edit prompt dialog
   */
  private openInlineEditPrompt(): void {
    if (this.selectedText) {
      // Get context if context provider is available
      let context = '';
      if (this.contextProvider) {
        context = this.contextProvider();
      }
      
      // Hide the sparkle icon when opening the dialog
      this.hideSparkleIcon();
      
      // Open the prompt dialog through the service
      this.inlineEditService.openPromptDialog(this.selectedText, context);
    }
  }
  
  /**
   * Apply the edited text to the selection
   * @param editedText The text to replace the selection with
   */
  private applyEdit(editedText: string): void {
    if (!this.selectionRange || !this.selectedText) {
      return;
    }
    
    if (this.editorInstance) {
      try {
        // Find the actual start and end positions within the editor's document model
        // This is important because DOM Range offsets might not map directly to the editor's model
        let startPos = 0;
        let endPos = 0;
        
        try {
          const editorElement = this.editorInstance.view.dom;
          const documentBody = editorElement.querySelector('.ProseMirror') || editorElement;
          
          // Create a Range that represents the editor's content
          const editorRange = document.createRange();
          editorRange.selectNodeContents(documentBody);
          
          // Calculate the offset relative to the editor content
          if (this.selectionRange.commonAncestorContainer === documentBody ||
              documentBody.contains(this.selectionRange.commonAncestorContainer)) {
            // Use the TipTap selection state instead, which is more reliable
            const selection = this.editorInstance.state.selection;
            startPos = selection.from;
            endPos = selection.to;
          }
        } catch (e) {
          console.error('Error calculating selection positions:', e);
          // Fallback to the original offsets
          startPos = this.selectionRange.startOffset;
          endPos = this.selectionRange.endOffset;
        }
        
        // Use the service to apply the edit if we have an editor instance
        const result = this.inlineEditService.applyInlineEdit(
          this.editorInstance,
          editedText,
          startPos,
          endPos
        );
        
        if (result && this.onContentUpdated) {
          this.onContentUpdated(result);
        }
      } catch (error) {
        console.error('Error applying inline edit:', error);
        this.toasterService.showError('Failed to apply edit');
      }
    } else if (this.onContentUpdated) {
      // If no editor instance but we have content updated callback,
      // provide the edited text and let the parent handle it
      try {
        this.onContentUpdated(editedText);
      } catch (error) {
        console.error('Error in content updated callback:', error);
        this.toasterService.showError('Failed to update content');
      }
    } else {
      console.error('No editor instance or content updated callback available');
      this.toasterService.showError('Could not apply edit');
    }
    
    this.hideSparkleIcon();
    
    // Show success toast
    this.toasterService.showSuccess('Text updated successfully');
  }
}
