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
import { EditorManager } from 'src/app/interfaces/editor-adapter.interface';

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
  /**
   * Editor manager instance - provides abstraction for different editor types
   */
  @Input() editorManager!: EditorManager;
  
  /**
   * Default prompt to use for inline editing
   */
  @Input() defaultPrompt: string = 'Improve this text to make it more clear, concise, and professional.';
  
  /**
   * Optional override position for the popup
   * If not provided, position will be calculated automatically
   */
  @Input() positionTop: number | null = null;
  @Input() positionLeft: number | null = null;
  
  // Text selection properties, automatically populated from editorManager if not provided
  @Input() selectedText: string = '';
  @Input() context: string = '';
  @Input() selectionStart: number = 0;
  @Input() selectionEnd: number = 0;
  
  // Events
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
    
    // If editor manager is provided but no position, calculate the position
    if (this.editorManager && this.positionTop === null && this.positionLeft === null) {
      const position = this.editorManager.calculatePopupPosition();
      this.positionTop = position.top;
      this.positionLeft = position.left;
    }
    
    // If text properties aren't provided, get them from the editor manager
    if (!this.selectedText && this.editorManager) {
      this.selectedText = this.editorManager.getSelectedText();
      this.selectionStart = this.editorManager.getSelectionStart();
      this.selectionEnd = this.editorManager.getSelectionEnd();
      this.context = this.editorManager.getContext();
    }
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
    if (!this.editedText || !this.editorManager) {
      this.hide();
      this.editCancelled.emit();
      return;
    }
    
    // Apply the edit using the editor manager
    this.editorManager.replaceSelection(this.editedText);
    
    // Get the updated content
    const updatedContent = this.editorManager.getContext();
    
    // Emit the updated content
    if (updatedContent) {
      this.editApplied.emit(updatedContent);
    }
    
    // Hide the UI
    this.hide();
    
    // Remove any highlights and unlock selection
    this.cleanupHighlights();
    
    // Signal the parent to hide the sparkle button controls
    this.controlsHide.emit();
  }
  
  /**
   * Cancel the edit
   */
  cancelEdit(): void {
    this.hide();
    
    // Use the editor manager to safely restore selection
    if (this.editorManager) {
      // Safe way to restore selection without modifying content
      this.editorManager.setSelection(this.selectionStart, this.selectionEnd);
      
      // Let the editor manager handle focus after a short delay
      setTimeout(() => {
        this.editorManager?.focus();
      }, 10);
    }
    
    // Clean up any lingering highlights
    this.cleanupHighlights();
    
    // Notify parent component that edit was cancelled
    this.editCancelled.emit();
  }
  
  /**
   * Clean up highlights and unlock selection
   */
  private cleanupHighlights(): void {
    if (!this.editorManager) return;
    
    try {
      // Remove highlight styling
      this.editorManager.removeHighlight();
      
      // Unlock the selection to allow new selections
      this.editorManager.unlockSelection();
    } catch (error) {
      this.logger.error('Error cleaning up highlights:', error);
    }
  }
  
  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    // Remove keyboard event listener to prevent memory leaks
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Unsubscribe from all active subscriptions
    this.subscription.unsubscribe();
  }
}
