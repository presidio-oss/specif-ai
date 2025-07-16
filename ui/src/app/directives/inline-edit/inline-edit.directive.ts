import {
  Directive,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { v4 as uuidv4 } from 'uuid';
import { Subject, fromEvent, takeUntil } from 'rxjs';
import { InlineEditService } from '../../services/inline-edit/inline-edit.service';
import { DOCUMENT } from '@angular/common';
import { InlineEditResponse } from '../../model/interfaces/chat.interface';
import { markdownToHtml } from '../../utils/markdown.utils';
import { htmlToMarkdown } from '../../utils/html.utils';
import { heroSparklesSolid as sparkleIcon } from '@ng-icons/heroicons/solid';

/**
 * Directive that adds inline edit functionality to elements
 * This allows users to select text, click a sparkle icon, and edit the text with AI assistance
 */
@Directive({
  selector: '[appInlineEdit]',
  standalone: true,
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
    @Inject(DOCUMENT) private document: Document,
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

    // Listen for selection changes to hide icon when selection is cleared
    fromEvent(this.document, 'selectionchange')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim() === '') {
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

  private isHandlingSparkleIconClick = false;

  @HostListener('blur')
  onBlur(): void {
    setTimeout(() => {
      if (
        !this.inlineEditService.isPromptOpen &&
        !this.isHandlingSparkleIconClick
      ) {
        this.hideSparkleIcon();
      }
    }, 500);
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

      if (
        this.selectionRange &&
        this.el.nativeElement.contains(
          this.selectionRange.commonAncestorContainer,
        )
      ) {
        try {
          const rect = this.selectionRange.getBoundingClientRect();
          if (rect) {
            this.lastSelectionPosition = {
              x: rect.right,
              y: rect.top,
            };
          }
        } catch (e) {
          console.warn('Could not get selection rectangle', e);
        }

        if (event) {
          this.lastSelectionPosition = {
            x: event.clientX,
            y: event.clientY,
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

    this.sparkleIcon = this.renderer.createElement('div');
    this.renderer.setAttribute(this.sparkleIcon, 'title', 'Edit with AI');

    if (this.sparkleIcon) {
      this.sparkleIcon.className = `
        fixed z-[9999] w-6 h-6 bg-primary-100 text-primary-500
        rounded-full flex items-center justify-center shadow
        backdrop-blur-sm transition-500 scale-0 cursor-pointer
      `.trim();
    }

    if (this.sparkleIcon) {
      this.sparkleIcon.style.left = `${this.lastSelectionPosition.x + 8}px`;
      this.sparkleIcon.style.top = `${this.lastSelectionPosition.y - 26}px`;
    }

    const sparkleIconSvg = sparkleIcon.replace(
      '<svg',
      '<svg fill="currentColor" width="16" height="16"',
    );
    this.renderer.setProperty(this.sparkleIcon, 'innerHTML', sparkleIconSvg);

    if (this.sparkleIcon) {
      this.sparkleIcon.addEventListener('mousedown', (event) => {
        this.isHandlingSparkleIconClick = true;
        event.preventDefault();
        event.stopPropagation();

        this.openInlineEditPrompt();

        setTimeout(() => {
          this.isHandlingSparkleIconClick = false;
        }, 1000);
      });
    }

    // Append to document
    if (this.sparkleIcon) {
      this.renderer.appendChild(this.document.body, this.sparkleIcon);
    }

    setTimeout(() => {
      if (this.sparkleIcon) {
        this.sparkleIcon.classList.remove('scale-0');
        this.sparkleIcon.classList.add('scale-100');
      }
    }, 0);
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
      this.toasterService.showError('No text selection found');
      return;
    }

    if (!editedText || editedText.trim() === '') {
      this.toasterService.showError('Edited text is empty');
      return;
    }

    if (this.editorInstance) {
      try {
        let startPos = 0;
        let endPos = 0;

        try {
          const editorElement = this.editorInstance.view.dom;
          const documentBody =
            editorElement.querySelector('.ProseMirror') || editorElement;

          const editorRange = document.createRange();
          editorRange.selectNodeContents(documentBody);

          // Calculate the offset relative to the editor content
          if (
            this.selectionRange.commonAncestorContainer === documentBody ||
            documentBody.contains(this.selectionRange.commonAncestorContainer)
          ) {
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

        // Apply the edit directly to the editor without affecting the whole content
        this.inlineEditService.applyInlineEdit(
          this.editorInstance,
          editedText,
          startPos,
          endPos,
        );

        if (this.onContentUpdated && this.editorInstance) {
          const selection = this.editorInstance.state.selection;
          this.editorInstance.commands.setTextSelection({
            from: startPos,
            to: startPos + editedText.length,
          });

          // Get the full HTML content from the editor
          const htmlContent = this.editorInstance.getHTML();

          // Convert the HTML back to markdown before saving
          htmlToMarkdown(htmlContent)
            .then((markdownContent) => {
              // Call the update callback with the markdown content (if defined)
              if (this.onContentUpdated) {
                this.onContentUpdated(markdownContent as string);
              }
            })
            .catch((error) => {
              console.error('Error converting HTML to markdown:', error);
              this.toasterService.showError('Error converting content format');
              // Fallback to the edited text directly if conversion fails
              if (this.onContentUpdated) {
                this.onContentUpdated(editedText);
              }
            });
        }

        try {
          // Calculate the new cursor position after the inserted text
          const newCursorPos = startPos + editedText.length;

          // Set cursor position and focus
          this.editorInstance.commands.setTextSelection(newCursorPos);
          this.editorInstance.commands.focus();
        } catch (e) {
          console.warn('Could not set cursor position:', e);
        }
      } catch (error) {
        console.error('Error applying inline edit:', error);
        this.toasterService.showError('Failed to apply edit');
      }
    } else if (this.onContentUpdated) {
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

    // Clean up
    this.hideSparkleIcon();
    this.cleanupSelection();

    // Show success toast
    this.toasterService.showSuccess('Text updated successfully');
  }

  /**
   * Clean up any lingering selections
   */
  private cleanupSelection(): void {
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection) {
        if (selection.empty) {
          selection.empty(); // Chrome
        } else if (selection.removeAllRanges) {
          selection.removeAllRanges(); // Firefox
        }
      }
    }

    this.selection = null;
    this.selectionRange = null;
    this.selectedText = '';
  }
}
