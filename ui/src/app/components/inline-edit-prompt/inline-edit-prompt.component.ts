import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../core/button/button.component';
import { InputFieldComponent } from '../core/input-field/input-field.component';
import { TextareaFieldComponent } from '../core/textarea-field/textarea-field.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroSparklesSolid, heroArrowRightCircleSolid } from '@ng-icons/heroicons/solid';
import { InlineEditResponse } from '../../model/interfaces/chat.interface';
import { ToasterService } from '../../services/toaster/toaster.service';
import { markdownToHtml } from '../../utils/markdown.utils';
import { heroArrowRight } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-inline-edit-prompt',
  templateUrl: './inline-edit-prompt.component.html',
  styles: [`
    :host {
      display: block;
    }
    
    ::ng-deep .inline-edit-dialog .mat-mdc-dialog-container {
      border-radius: 16px !important;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2) !important;
    }
    
    ::ng-deep .inline-edit-dialog .mdc-dialog__surface {
      background-color: transparent !important;
      color: var(--foreground);
      border: none !important;
    }
    
    ::ng-deep .inline-edit-dialog .mdc-dialog__container {
      backdrop-filter: blur(10px);
    }
    
    ::ng-deep .inline-edit-backdrop {
      background: rgba(255, 255, 255, 0.5);
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    ButtonComponent,
    InputFieldComponent,
    TextareaFieldComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({ 
      heroSparklesSolid, 
      heroArrowRightCircleSolid,
      heroArrowRight
    })
  ]
})
export class InlineEditPromptComponent implements OnInit, OnDestroy {
  promptForm!: FormGroup;
  selectedText: string;
  editedText: string = '';
  renderedHtml: string = '';
  isLoading: boolean = false;
  isEditReady: boolean = false;
  errorMessage: string = '';
  
  constructor(
    public dialogRef: MatDialogRef<InlineEditPromptComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      selectedText: string;
      context?: string;
      editedText?: string;
      processFunction?: (prompt: string) => Promise<InlineEditResponse>;
    },
    private toasterService: ToasterService
  ) {
    this.selectedText = data.selectedText;
    
    // If editedText is provided, we're in review mode
    if (data.editedText) {
      this.editedText = data.editedText;
      this.isEditReady = true;
    }
    
    // Configure dialog to close when escape key is pressed
    this.dialogRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') {
        this.onCancel();
      }
    });
    
    // Allow clicking outside to close the dialog
    this.dialogRef.backdropClick().subscribe(() => {
      this.onCancel();
    });
  }
  
  ngOnInit(): void {
    this.initForm();
    
    // Add keyboard event listener for escape key
    document.addEventListener('keydown', this.handleEscapeKey);
  }
  
  ngOnDestroy(): void {
    // Remove keyboard event listener when component is destroyed
    document.removeEventListener('keydown', this.handleEscapeKey);
  }
  
  // Handler for escape key press
  handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.onCancel();
    }
  }
  
  private initForm(): void {
    this.promptForm = new FormGroup({
      userPrompt: new FormControl('', Validators.required)
    });
    
    // Set initial focus on the prompt input
    setTimeout(() => {
      const inputElement = document.getElementById('userPrompt');
      if (inputElement) {
        inputElement.focus();
      }
    }, 0);
  }
  
  /**
   * Auto-resize the textarea based on content
   * @param event Input event from textarea
   */
  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
  
  async onSubmit(): Promise<void> {
    if (this.promptForm.valid && this.data.processFunction) {
      try {
        // Update UI state
        this.isLoading = true;
        this.errorMessage = '';
        
        // Process the inline edit
        const response = await this.data.processFunction(
          this.promptForm.get('userPrompt')?.value
        );
        
        // Handle response
        if (response.success) {
          this.editedText = response.editedText;
          // Convert markdown to HTML for display
          this.renderedHtml = markdownToHtml(this.editedText);
          this.isLoading = false;
          this.isEditReady = true;
        } else {
          this.isLoading = false;
          this.errorMessage = response.error || 'Failed to generate edit';
          this.toasterService.showError(this.errorMessage);
        }
      } catch (error) {
        this.isLoading = false;
        this.errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        this.toasterService.showError(this.errorMessage);
      }
    }
  }
  
  onCancel(): void {
    this.dialogRef.close();
  }
  
  /**
   * Accept the AI-generated edit
   */
  acceptEdit(): void {
    this.toasterService.showSuccess('Edit applied');
    this.dialogRef.close({
      accepted: true,
      editedText: this.editedText
    });
  }
  
  /**
   * Reject the AI-generated edit - go back to prompt screen instead of closing dialog
   */
  rejectEdit(): void {
    this.toasterService.showInfo('Edit rejected');
    this.goBackToPrompt();
  }
  
  /**
   * Go back to the prompt screen
   */
  goBackToPrompt(): void {
    this.isEditReady = false;
    this.editedText = '';
    this.renderedHtml = '';
    this.promptForm.reset();
    
    // Set focus back to the prompt input
    setTimeout(() => {
      const inputElement = document.getElementById('userPrompt');
      if (inputElement) {
        inputElement.focus();
      }
    }, 0);
  }
}
