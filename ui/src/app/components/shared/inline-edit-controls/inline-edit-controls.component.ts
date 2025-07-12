import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroSparkles, heroCheck, heroXMark } from '@ng-icons/heroicons/outline';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-inline-edit-controls',
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
  template: `
    <div class="inline-edit-controls" *ngIf="visible" [style.top.px]="position.top" [style.left.px]="position.left">
      <!-- Show prompt input if in prompt mode -->
      <div class="prompt-container" *ngIf="showPromptInput">
        <textarea
          class="prompt-input"
          [(ngModel)]="userPrompt"
          placeholder="Tell AI how to edit the text..."
          [disabled]="isLoading"
        ></textarea>
        <div class="prompt-buttons">
          <button class="btn btn-primary" (click)="onSubmitPrompt()" [disabled]="isLoading || !userPrompt">
            <ng-icon name="heroSparklesSolid" size="18"></ng-icon> Edit with AI
          </button>
          <button class="btn btn-secondary" (click)="onCancel()">
            <ng-icon name="heroXMark" size="18"></ng-icon> Cancel
          </button>
        </div>
      </div>
      
      <!-- Show loading state if loading -->
      <div class="loading-container" *ngIf="isLoading">
        <div class="loading-spinner"></div>
        <span>Generating edit...</span>
      </div>
      
      <!-- Show result preview if edit is ready -->
      <div class="preview-container" *ngIf="!showPromptInput && !isLoading && editedText">
        <div class="preview-content" [innerHTML]="renderedHtml"></div>
        <div class="preview-buttons">
          <button class="btn btn-success" (click)="onApply()">
            <ng-icon name="heroCheck" size="18"></ng-icon> Apply
          </button>
          <button class="btn btn-secondary" (click)="onCancel()">
            <ng-icon name="heroXMark" size="18"></ng-icon> Cancel
          </button>
        </div>
      </div>
      
      <!-- Show sparkle button initially -->
      <div class="sparkle-button" *ngIf="!showPromptInput && !isLoading && !editedText">
        <button class="btn btn-icon" (click)="onRequestEdit()">
          <ng-icon name="heroSparkles" size="18"></ng-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .inline-edit-controls {
      position: absolute;
      z-index: 100;
      transform: translateX(-50%);
    }
    
    .sparkle-button {
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      padding: 8px;
    }
    
    .btn-icon {
      border: none;
      background: none;
      color: #3b82f6;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
    }
    
    .btn-icon:hover {
      background-color: rgba(59, 130, 246, 0.1);
    }
    
    .prompt-container, .preview-container, .loading-container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      padding: 16px;
      min-width: 300px;
      max-width: 500px;
    }
    
    .prompt-input {
      width: 100%;
      min-height: 80px;
      padding: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    
    .prompt-buttons, .preview-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    .btn {
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .btn-primary {
      background-color: #3b82f6;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #2563eb;
    }
    
    .btn-success {
      background-color: #10b981;
      color: white;
    }
    
    .btn-success:hover {
      background-color: #059669;
    }
    
    .btn-secondary {
      background-color: #e5e7eb;
      color: #1f2937;
    }
    
    .btn-secondary:hover {
      background-color: #d1d5db;
    }
    
    .loading-spinner {
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .preview-content {
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 10px;
      max-height: 200px;
      overflow-y: auto;
      background-color: #f9fafb;
    }
  `]
})
export class InlineEditControlsComponent implements OnChanges {
  @Input() visible: boolean = false;
  @Input() position: { top: number, left: number } = { top: 0, left: 0 };
  @Input() isLoading: boolean = false;
  @Input() editedText: string = '';
  @Input() renderedHtml: string = '';
  @Input() defaultPrompt: string = 'Improve this text to make it more clear, concise, and professional.';

  @Output() requestEdit = new EventEmitter<void>();
  @Output() submitPrompt = new EventEmitter<string>();
  @Output() applyEdit = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();

  showPromptInput: boolean = false;
  userPrompt: string = '';

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    // Reset state when visibility changes
    if (changes['visible'] && !changes['visible'].firstChange) {
      if (changes['visible'].currentValue === true) {
        this.showPromptInput = false;
        this.userPrompt = '';
        this.editedText = '';
      }
    }
  }

  /**
   * Handle request edit button click
   */
  onRequestEdit(): void {
    this.showPromptInput = true;
    this.userPrompt = this.defaultPrompt;
    this.requestEdit.emit();
  }

  /**
   * Handle submit prompt button click
   */
  onSubmitPrompt(): void {
    if (!this.userPrompt) return;
    this.submitPrompt.emit(this.userPrompt);
  }

  /**
   * Handle apply edit button click
   */
  onApply(): void {
    this.applyEdit.emit();
    this.reset();
  }

  /**
   * Handle cancel button click
   */
  onCancel(): void {
    this.cancelEdit.emit();
    this.reset();
  }

  /**
   * Reset the component state
   */
  private reset(): void {
    this.showPromptInput = false;
    this.userPrompt = '';
    this.editedText = '';
  }
}
