import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroSparkles, heroCheck, heroXMark } from '@ng-icons/heroicons/outline';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';
import { Subscription } from 'rxjs';
import { InlineEditService, InlineEditStreamEvent } from 'src/app/services/inline-edit/inline-edit.service';
import { NGXLogger } from 'ngx-logger';
import { markdownToHtml } from 'src/app/utils/markdown.utils';

@Component({
  selector: 'app-inline-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  providers: [
    provideIcons({
      heroSparkles,
      heroCheck,
      heroXMark,
      heroSparklesSolid,
    })
  ],
  templateUrl: './inline-edit.component.html',
  styleUrls: ['./inline-edit.component.scss']
})
export class InlineEditComponent implements OnInit, OnDestroy {
  @Input() selectedText: string = '';
  @Input() editorInstance: any;
  @Input() selectionStart: number = 0;
  @Input() selectionEnd: number = 0;
  @Input() context: string = '';
  @Input() positionTop: number = 0;
  @Input() positionLeft: number = 0;
  @Input() defaultPrompt: string = 'Improve this text to make it more clear, concise, and professional.';
  
  @Output() editApplied = new EventEmitter<string>();
  @Output() editCancelled = new EventEmitter<void>();
  @Output() controlsHide = new EventEmitter<void>();
  
  isActive: boolean = false;
  isLoading: boolean = false;
  showPromptInput: boolean = false;
  userPrompt: string = '';
  editedText: string = '';
  renderedHtml: string = '';
  
  private subscription: Subscription = new Subscription();
  
  constructor(
    private inlineEditService: InlineEditService,
    private logger: NGXLogger
  ) {}
  
  ngOnInit(): void {
    // Start with an empty prompt instead of using the default
    this.userPrompt = '';
    
    // Add a global keyboard event listener for ESC key
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  /**
   * Handle keyboard events globally to detect Escape key presses
   * This ensures the edit can be dismissed with Escape from anywhere
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // Only process when the component is active
    if (this.isActive && event.key === 'Escape') {
      this.cancelEdit();
      // Prevent the event from propagating further
      event.preventDefault();
      event.stopPropagation();
    }
  }
  
  /**
   * Show the inline edit UI
   */
  show(): void {
    this.isActive = true;
    this.showPromptInput = true;
  }
  
  /**
   * Hide the inline edit UI
   */
  hide(): void {
    this.isActive = false;
    this.showPromptInput = false;
    this.isLoading = false;
    this.editedText = '';
    this.userPrompt = ''; // Clear the prompt field
  }
  
  /**
   * Submit the prompt and start the inline edit process
   */
  submitPrompt(): void {
    if (!this.selectedText) {
      this.logger.warn('No text selected for inline edit');
      this.hide();
      this.editCancelled.emit();
      return;
    }
    
    // Hide prompt input and show loading state
    this.showPromptInput = false;
    this.isLoading = true;
    
    // Request the inline edit
    const editObservable = this.inlineEditService.requestInlineEdit(
      this.selectedText,
      this.userPrompt,
      this.context,
      this.selectionStart,
      this.selectionEnd
    );
    
    // Subscribe to the edit events
    this.subscription.add(
      editObservable.subscribe({
        next: (event: InlineEditStreamEvent) => {
          switch (event.type) {
            case 'start':
              this.isLoading = true;
              break;
              
            case 'chunk':
              if (event.content) {
                this.editedText += event.content;
                this.renderedHtml = markdownToHtml(this.editedText);
              }
              break;
              
            case 'end':
              if (event.content) {
                this.editedText = event.content;
                this.renderedHtml = markdownToHtml(this.editedText);
              }
              this.isLoading = false;
              break;
              
            case 'error':
              this.logger.error('Error in inline edit:', event.error);
              this.isLoading = false;
              this.hide();
              this.editCancelled.emit();
              break;
          }
        },
        error: (error) => {
          this.logger.error('Error in inline edit subscription:', error);
          this.isLoading = false;
          this.hide();
          this.editCancelled.emit();
        }
      })
    );
  }
  
  /**
   * Apply the edited text
   */
  applyEdit(): void {
    if (!this.editedText || !this.editorInstance) {
      this.hide();
      this.editCancelled.emit();
      return;
    }
    
    // Apply the edit
    const updatedContent = this.inlineEditService.applyInlineEdit(
      this.editorInstance,
      this.editedText,
      this.selectionStart,
      this.selectionEnd
    );
    
    // Emit the updated content
    if (updatedContent) {
      this.editApplied.emit(updatedContent);
    }
    
    // Hide the UI
    this.hide();
    
    // Remove any highlights and clean up event listeners
    this.cleanupHighlights();
    
    // Signal the parent to hide the sparkle button controls
    this.controlsHide.emit();
  }
  
  /**
   * Cancel the edit
   */
  cancelEdit(): void {
    this.hide();
    
    // Remove any highlights and clean up event listeners
    this.cleanupHighlights();
    
    // Emit the cancel event last (after cleanup)
    this.editCancelled.emit();
  }
  
  /**
   * Clean up any highlights that may remain in the editor
   * This ensures that no highlight styling remains after the edit is complete
   */
  private cleanupHighlights(): void {
    if (!this.editorInstance) return;
    
    try {
      // Remove all highlighting from the document
      this.cleanupAllHighlightElements();
      
      // Remove the selection change event listener
      document.removeEventListener('selectionchange', this.getParentEventHandler());
      
      // Re-focus the editor after a short delay
      setTimeout(() => {
        if (this.editorInstance) {
          this.editorInstance.commands.focus();
        }
      }, 150);
    } catch (error) {
      this.logger.error('Error cleaning up highlights:', error);
    }
  }

  /**
   * Perform thorough cleanup of all highlight elements
   * This method ensures no highlight styling remains in the document
   */
  private cleanupAllHighlightElements(): void {
    if (!this.editorInstance) return;
    
    try {
      // 1. Use TipTap's API to remove highlights
      this.editorInstance.commands.unsetMark('highlight');
      
      // Get the parent canvas editor component if possible
      const canvasEditorInstance = this.getParentCanvasEditor();
      if (canvasEditorInstance && typeof canvasEditorInstance.removeHighlight === 'function') {
        // 2. Use the canvas editor's removeHighlight method for thorough cleanup
        canvasEditorInstance.removeHighlight();
      } else {
        // 3. Fallback: manual DOM cleanup if we can't find the parent
        this.manualDOMCleanup();
      }
      
      // 4. Force selection reset by clearing any active selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
      
    } catch (error) {
      this.logger.error('Error cleaning up highlight elements:', error);
    }
  }
  
  /**
   * Manual cleanup of DOM elements when parent component methods aren't available
   */
  private manualDOMCleanup(): void {
    try {
      // Get the editor DOM element
      const editorDOM = this.editorInstance?.view?.dom;
      if (!editorDOM) return;
      
      // Remove editor-wide class
      editorDOM.classList.remove('inline-edit-active');
      
      // Cleanup all highlight classes
      const highlightClasses = [
        '.inline-edit-selection',
        '.inline-edit-selection-persistent',
        '.inline-edit-selection-node',
        '.inline-edit-selection-overlay'
      ];
      
      highlightClasses.forEach(className => {
        const elements = editorDOM.querySelectorAll(className);
        elements.forEach((el: Element) => {
          if (el.parentNode) {
            // Unwrap the element (preserve its contents)
            while (el.firstChild) {
              el.parentNode.insertBefore(el.firstChild, el);
            }
            el.parentNode.removeChild(el);
          }
        });
      });
      
      // Remove any overlay containers
      const overlayContainer = editorDOM.querySelector('.selection-overlay-container');
      if (overlayContainer && overlayContainer.parentNode) {
        overlayContainer.parentNode.removeChild(overlayContainer);
      }
      
    } catch (error) {
      this.logger.error('Error in manual DOM cleanup:', error);
    }
  }
  
  /**
   * Get the parent component's event handler for selectionchange events
   * This is necessary to properly remove the event listener
   */
  private getParentEventHandler(): EventListener {
    const canvasEditor = (this.editorInstance as any)?.view?.dom?.closest('app-canvas-editor');
    return canvasEditor?.__ngContext__?.instance?.preventSelectionClear || (() => {});
  }
  
  /**
   * Get the parent canvas editor component instance
   * This is used to access the removeHighlight method for thorough cleanup
   */
  private getParentCanvasEditor(): any {
    try {
      const canvasEditor = (this.editorInstance as any)?.view?.dom?.closest('app-canvas-editor');
      return canvasEditor?.__ngContext__?.instance;
    } catch (error) {
      this.logger.warn('Error getting parent canvas editor component:', error);
      return null;
    }
  }
  
  ngOnDestroy(): void {
    // Remove keyboard event listener to prevent memory leaks
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Unsubscribe from all active subscriptions
    this.subscription.unsubscribe();
  }
}
