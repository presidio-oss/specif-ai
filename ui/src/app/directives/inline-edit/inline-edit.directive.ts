import { Directive, ElementRef, HostListener, Inject, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { v4 as uuidv4 } from 'uuid';
import { Subject, fromEvent, takeUntil } from 'rxjs';
import { InlineEditService } from '../../services/inline-edit/inline-edit.service';
import { DOCUMENT } from '@angular/common';
import { InlineEditResponse } from '../../model/interfaces/chat.interface';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';
import { createComponent, ApplicationRef, ComponentRef, Injector } from '@angular/core';
import { markdownToHtml } from '../../utils/markdown.utils';

/**
 * Directive that adds inline edit functionality to elements
 * This allows users to select text, click a sparkle icon, and edit the text with AI assistance
 */
@Directive({
  selector: '[appInlineEdit]',
  standalone: true,
  providers: [
    provideIcons({ heroSparklesSolid })
  ]
})
export class InlineEditDirective implements OnInit, OnDestroy {
  @Input() contextProvider?: () => string;
  @Input() onContentUpdated?: (newContent: string) => void;
  @Input() editable = true;
  
  private sparkleIcon: HTMLElement | null = null;
  private iconComponentRef: ComponentRef<NgIconComponent> | null = null;
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
    private injector: Injector,
    private appRef: ApplicationRef
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
    
    // Calculate position (offset from selection)
    this.renderer.setStyle(this.sparkleIcon, 'left', `${this.lastSelectionPosition.x + 10}px`);
    this.renderer.setStyle(this.sparkleIcon, 'top', `${this.lastSelectionPosition.y - 30}px`);
    
    // Create NgIconComponent and attach it
    const iconElement = this.renderer.createElement('div');
    this.renderer.appendChild(this.sparkleIcon, iconElement);
    
    // Use NgIcon component
    this.iconComponentRef = createComponent(NgIconComponent, {
      environmentInjector: this.appRef.injector,
      elementInjector: this.injector,
      hostElement: iconElement
    });
    
    // Set icon properties
    this.iconComponentRef.instance.name = 'heroSparklesSolid';
    this.iconComponentRef.instance.size = '16';
    this.renderer.setStyle(iconElement, 'color', '#3b82f6');
    
    // Attach to the DOM
    this.iconComponentRef.changeDetectorRef.detectChanges();
    
    // Add click event to the sparkle icon
    if (this.sparkleIcon) {
      this.sparkleIcon.addEventListener('click', () => {
        this.openInlineEditPrompt();
      });
    }
    
    // Add tooltip attribute
    if (this.sparkleIcon) {
      this.renderer.setAttribute(this.sparkleIcon, 'title', 'Edit with AI');
      
      // Add to body
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
    if (this.iconComponentRef) {
      this.iconComponentRef.destroy();
      this.iconComponentRef = null;
    }
    
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
    
    // Get the editor instance if available (for rich text editors)
    const editor = this.el.nativeElement.editor;
    
    // If we have an editor with commands API, use direct editor commands
      try {
        // Set the selection in the editor
        editor.commands.setTextSelection({
          from: this.selectionRange.startOffset,
          to: this.selectionRange.endOffset
        });
        
        // Delete the selected content
        editor.commands.deleteSelection();
        
        // Convert markdown to HTML before inserting
        const html = markdownToHtml(editedText);
        
        // Insert the HTML content with proper formatting
        editor.commands.insertContent(html, {
          parseOptions: {
            preserveWhitespace: 'full'
          }
        });
      } catch (error) {
        console.error('Error using editor commands:', error);
      }
    
    this.hideSparkleIcon();
    
    // Show success toast
    this.toasterService.showSuccess('Text updated successfully');
  }
}
