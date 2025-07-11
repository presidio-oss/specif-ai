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
  }
  
  /**
   * Cancel the edit
   */
  cancelEdit(): void {
    this.hide();
    this.editCancelled.emit();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
