import { Directive, ElementRef, HostListener, Input, Output, EventEmitter, OnInit, OnDestroy, NgZone } from '@angular/core';
import { InlineEditService } from '../services/inline-edit/inline-edit.service';
import { NGXLogger } from 'ngx-logger';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/**
 * Inline Editable Directive
 * 
 * This directive can be added to any editable component to make it support inline AI editing.
 * It handles selection tracking, UI positioning, and interaction with the inline edit service.
 * 
 * Usage:
 * <div [appInlineEditable]="true" (inlineEditApplied)="onEditApplied($event)"></div>
 */
@Directive({
  selector: '[appInlineEditable]',
  standalone: true
})
export class InlineEditableDirective implements OnInit, OnDestroy {
  @Input('appInlineEditable') enabled: boolean = true;
  
  // Event emitted when selection changes in the host element
  @Output() selectionChanged = new EventEmitter<{
    text: string;
    start: number;
    end: number;
    position: { top: number, left: number }
  } | undefined>();
  
  // Event emitted when text is updated through inline edit
  @Output() inlineEditApplied = new EventEmitter<string>();
  
  private selection: {
    text: string;
    start: number;
    end: number;
    position: { top: number, left: number }
  } | null = null;
  
  private subscriptions: Subscription = new Subscription();
  private controlsVisible: boolean = false;

  constructor(
    private el: ElementRef,
    private inlineEditService: InlineEditService,
    private logger: NGXLogger,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Set up selection change listener for the editable element
    this.ngZone.runOutsideAngular(() => {
      this.subscriptions.add(
        fromEvent<MouseEvent>(this.el.nativeElement, 'mouseup')
          .pipe(debounceTime(200))
          .subscribe(() => {
            this.ngZone.run(() => this.checkSelection());
          })
      );
      
      this.subscriptions.add(
        fromEvent<KeyboardEvent>(this.el.nativeElement, 'keyup')
          .pipe(debounceTime(200))
          .subscribe((event) => {
            // Only check selection on certain key events
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || event.shiftKey) {
              this.ngZone.run(() => this.checkSelection());
            }
          })
      );
    });
  }

  /**
   * Check if there's a text selection in the host element
   */
  private checkSelection(): void {
    if (!this.enabled) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Check if the selection is within our element
    if (!this.isSelectionWithinElement(selection)) return;
    
    const text = selection.toString().trim();
    
    // Only emit if we have actual text selected
    if (text && text.length > 0) {
      // Calculate position for inline edit controls
      const rect = range.getBoundingClientRect();
      const elRect = this.el.nativeElement.getBoundingClientRect();
      
      this.selection = {
        text,
        start: this.getSelectionStart(selection),
        end: this.getSelectionEnd(selection),
        position: {
          top: rect.bottom - elRect.top,
          left: rect.left - elRect.left + (rect.width / 2)
        }
      };
      
      this.selectionChanged.emit(this.selection);
      this.controlsVisible = true;
    } else if (this.controlsVisible) {
      // Hide controls if there's no longer a selection
      this.controlsVisible = false;
      this.selectionChanged.emit(undefined);
    }
  }
  
  /**
   * Check if the selection is within the host element
   */
  private isSelectionWithinElement(selection: Selection): boolean {
    const range = selection.getRangeAt(0);
    return this.el.nativeElement.contains(range.commonAncestorContainer);
  }
  
  /**
   * Get the selection start position
   * This is a simplified implementation that works for basic cases
   * For more complex editors, this would need to be implemented by the specific editor adapter
   */
  private getSelectionStart(selection: Selection): number {
    // Simplified implementation - actual implementation would depend on the editor
    return 0; 
  }
  
  /**
   * Get the selection end position
   * This is a simplified implementation that works for basic cases
   */
  private getSelectionEnd(selection: Selection): number {
    // Simplified implementation - actual implementation would depend on the editor
    return this.selection?.text?.length || 0;
  }
  
  /**
   * Request an inline edit for the current selection
   */
  requestInlineEdit(prompt: string): void {
    if (!this.selection || !this.enabled) return;
    
    // Get content from the host element
    const content = this.el.nativeElement.textContent || this.el.nativeElement.innerText || '';
    
    // Request the edit
    const editObservable = this.inlineEditService.requestInlineEdit(
      this.selection.text,
      prompt,
      content,
      this.selection.start,
      this.selection.end
    );
    
    this.subscriptions.add(
      editObservable.subscribe({
        next: (event) => {
          if (event.type === 'end' && event.content) {
            // Apply the edit to the element
            this.applyEdit(event.content);
          }
        },
        error: (error) => {
          this.logger.error('Error applying inline edit:', error);
        }
      })
    );
  }
  
  /**
   * Apply the edited text to the host element
   * This implementation is simplified and would need to be tailored to specific editors
   */
  private applyEdit(editedText: string): void {
    // This is a simplified implementation
    // In practice, you would use the editor's API to apply the edit
    
    try {
      // Example for a contentEditable element
      if (this.el.nativeElement.isContentEditable) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(editedText));
        }
      }
      // Example for an input or textarea
      else if (this.el.nativeElement.tagName === 'INPUT' || this.el.nativeElement.tagName === 'TEXTAREA') {
        const start = this.el.nativeElement.selectionStart;
        const end = this.el.nativeElement.selectionEnd;
        const text = this.el.nativeElement.value;
        this.el.nativeElement.value = text.substring(0, start) + editedText + text.substring(end);
      }
      
      // Emit the updated content
      this.inlineEditApplied.emit(this.el.nativeElement.textContent || this.el.nativeElement.value || '');
    } catch (error) {
      this.logger.error('Error applying edit:', error);
    }
  }
  
  /**
   * Highlight the current selection
   * This is useful when you want to keep the selection visible during the edit
   */
  highlightSelection(): void {
    // Implementation would depend on the editor/element type
    // For contentEditable, could wrap selected text in a span with highlight class
    // For inputs/textareas, could use a custom overlay
  }
  
  /**
   * Remove the highlight from the current selection
   */
  removeHighlight(): void {
    // Implementation would depend on the editor/element type
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
