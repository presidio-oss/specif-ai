import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroBold,
  heroItalic,
  heroListBullet,
  heroNumberedList,
  heroLink,
  heroLinkSlash,
  heroChevronDown,
  heroDocumentPlus,
  heroSparkles,
  heroPencil,
} from '@ng-icons/heroicons/outline';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';
import { Subscription } from 'rxjs';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
import { ElectronService } from 'src/app/electron-bridge/electron.service';
import { DocumentUpdateResponse } from 'src/app/electron-bridge/electron.interface';
import { DocumentUpdateService } from 'src/app/services/document-update/document-update.service';
import { InlineEditComponent } from 'src/app/components/shared/inline-edit/inline-edit.component';

export interface SectionInfo {
  id: string;
  title: string;
  content: string;
  startPos: number;
  endPos: number;
}

export interface EditProposal {
  type: 'append' | 'section' | 'full' | 'inline';
  content: string;
  sectionToReplace?: string;
  selectionText?: string;
  selectionStart?: number;
  selectionEnd?: number;
}

// Using the imported InlineEditResponse from chat.interface.ts

@Component({
  selector: 'app-canvas-editor',
  templateUrl: './canvas-editor.component.html',
  styleUrls: ['./canvas-editor.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    NgIf,
    NgFor,
    FormsModule,
    NgIcon,
    MatTooltipModule,
    RichTextEditorComponent,
    InlineEditComponent
  ],
  providers: [
    provideIcons({
      heroBold,
      heroItalic,
      heroListBullet,
      heroNumberedList,
      heroLink,
      heroLinkSlash,
      heroChevronDown,
      heroDocumentPlus,
      heroSparklesSolid,
      heroSparkles,
      heroPencil,
    })
  ]
})
export class CanvasEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() content: string = '';
  @Input() editable: boolean = true;
  @Input() showSidebar: boolean = true;
  @Input() projectId: string = '';
  @Input() documentTitle: string = 'Untitled Document';
  @ViewChild(RichTextEditorComponent) richTextEditor!: RichTextEditorComponent;
  @ViewChild(InlineEditComponent) inlineEdit!: InlineEditComponent;
  
  @Output() contentChange = new EventEmitter<string>();
  @Output() sectionSelected = new EventEmitter<SectionInfo>();
  @Output() editProposed = new EventEmitter<EditProposal>();
  @Output() titleChange = new EventEmitter<string>();
  
  sections: SectionInfo[] = [];
  selectedSection: SectionInfo | null = null;
  proposedEdit: EditProposal | null = null;
  
  // Document properties
  isEditingTitle: boolean = false;
  
  // Selection properties
  selectedText: string = '';
  selectionStart: number = 0;
  selectionEnd: number = 0;
  showInlineEditControls: boolean = false;
  
  // Inline edit properties
  inlineEditActive: boolean = false;
  inlineEditLoading: boolean = false;
  
  // Inline edit UI positions
  inlineEditTop: number = 0;
  inlineEditLeft: number = 0;
  defaultPrompt: string = 'Improve this text to make it more clear, concise, and professional.';
  
  // Selection state for persisting between operations
  private selectionHighlighted: boolean = false;
  private selectionMarker: any = null;
  private activeSelection: {text: string, start: number, end: number} | null = null;
  private decorationSet: any = null;
  
  private subscriptions: Subscription = new Subscription();
  
  constructor(
    private logger: NGXLogger,
    private electronService: ElectronService,
    private dialog: MatDialog,
    private documentUpdateService: DocumentUpdateService
  ) {}
  
  
  ngOnChanges(): void {
    if (this.richTextEditor?.editor) {
      if (this.content !== this.richTextEditor.editor.getHTML()) {
        this.richTextEditor.writeValue(this.content);
      }
      this.parseContentSections();
    }
  }
  
  /**
   * Parse the content into sections based on markdown headings
   * This method analyzes the document structure to identify sections
   */
  parseContentSections(): void {
    if (!this.richTextEditor?.editor) return;
    
    const editor = this.richTextEditor.editor;
    const doc = editor.state.doc;
    const sections: SectionInfo[] = [];
    
    try {
      // Track heading positions to identify sections
      const headingPositions: {pos: number, title: string, id: string}[] = [];
      
      // First pass: find all headings in the document
      doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const title = node.textContent;
          const id = this.generateSectionId(title);
          headingPositions.push({ pos, title, id });
        }
        return true;
      });
      
      // If no headings found, create a single section with the document title or "Document"
      if (headingPositions.length === 0) {
        // Try to extract a title from the first paragraph or use "Document"
        let documentTitle = "Document";
        doc.descendants((node, pos) => {
          if (node.type.name === 'paragraph' && node.textContent.trim()) {
            documentTitle = node.textContent.trim().split('\n')[0];
            return false; // Stop after finding the first paragraph
          }
          return true;
        });
        
        sections.push({
          id: 'document',
          title: documentTitle.length > 30 ? documentTitle.substring(0, 30) + '...' : documentTitle,
          content: editor.getHTML(),
          startPos: 0,
          endPos: doc.content.size
        });
      } else {
        // If content exists before the first heading, create an "Introduction" section
        if (headingPositions[0].pos > 0) {
          const introContent = doc.textBetween(0, headingPositions[0].pos, ' ');
          if (introContent.trim()) {
            sections.push({
              id: 'intro',
              title: 'Introduction',
              content: introContent,
              startPos: 0,
              endPos: headingPositions[0].pos
            });
          }
        }
        
        // Create sections based on headings
        for (let i = 0; i < headingPositions.length; i++) {
          const { pos: startPos, title, id } = headingPositions[i];
          const endPos = i < headingPositions.length - 1 
            ? headingPositions[i + 1].pos 
            : doc.content.size;
          
          sections.push({
            id,
            title,
            content: doc.textBetween(startPos, endPos, ' '),
            startPos,
            endPos
          });
        }
      }
      
      this.sections = sections;
      
      // If we have a selected section, make sure it's still valid after parsing
      if (this.selectedSection) {
        const sectionStillExists = sections.some(s => s.id === this.selectedSection?.id);
        if (!sectionStillExists && sections.length > 0) {
          this.selectedSection = sections[0];
          this.sectionSelected.emit(this.selectedSection);
        }
      }
    } catch (error) {
      this.logger.error('Error parsing document sections:', error);
      // Fallback to a single section if parsing fails
      this.sections = [{
        id: 'document',
        title: 'Document',
        content: editor.getHTML(),
        startPos: 0,
        endPos: doc.content.size
      }];
    }
  }
  
  /**
   * Set up a handler for selection changes in the editor
   */
  setupSelectionHandler(): void {
    if (!this.richTextEditor?.editor) return;
    
    const editor = this.richTextEditor.editor;
    
    // Listen for selection changes but don't interfere with normal text operations
    editor.on('selectionUpdate', ({ editor }) => {
      // Only track selections if not in inline edit mode
      if (!this.inlineEditActive) {
        const { from, to } = editor.state.selection;
        
        // Store the selected text and position for inline editing
        if (from !== to) {
          this.selectedText = editor.state.doc.textBetween(from, to);
          this.selectionStart = from;
          this.selectionEnd = to;
          
          // Calculate position for inline edit controls
          this.calculateInlineEditPosition();
          
          // Show inline edit controls
          this.showInlineEditControls = true;
        } else {
          this.selectedText = '';
          this.selectionStart = 0;
          this.selectionEnd = 0;
          this.showInlineEditControls = false;
        }
        
        // Find which section contains this selection
        const section = this.sections.find(
          s => from >= s.startPos && from <= s.endPos
        );
        
        if (section && (!this.selectedSection || this.selectedSection.id !== section.id)) {
          this.selectedSection = section;
          this.sectionSelected.emit(section);
        }
      } else {
        // If we're in inline edit mode, prevent new selections by restoring the active selection
        this.preventNewSelections();
      }
    });
    
    // Add handler for mousedown to prevent new selections when inline edit is active
    editor.view.dom.addEventListener('mousedown', (event: MouseEvent) => {
      if (this.inlineEditActive && this.inlineEdit?.isActive) {
        // Don't prevent clicks on the inline edit controls themselves
        const target = event.target as HTMLElement;
        const clickedOnInlineEdit = target.closest('app-inline-edit') !== null;
        
        if (!clickedOnInlineEdit) {
          // Prevent the default behavior which would start a new selection
          event.preventDefault();
          event.stopPropagation();
          
          // Keep the current selection
          this.preventNewSelections();
        }
      }
    });
    
    // Add keyboard event handler to prevent new selections via keyboard shortcuts
    editor.view.dom.addEventListener('keydown', (event: KeyboardEvent) => {
      if (this.inlineEditActive && this.inlineEdit?.isActive) {
        // Allow keys in the inline edit component
        const target = event.target as HTMLElement;
        const keyInInlineEdit = target.closest('app-inline-edit') !== null;
        
        // List of keys that could change selection like arrow keys with shift, etc.
        const selectionKeys = [
          'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
          'Home', 'End', 'PageUp', 'PageDown'
        ];
        
        if (!keyInInlineEdit && (event.shiftKey || selectionKeys.includes(event.key))) {
          // Prevent keyboard-based selection changes
          event.preventDefault();
          event.stopPropagation();
          
          // Keep the current selection
          this.preventNewSelections();
        }
      }
    });
  }
  
  /**
   * Prevent new selections by restoring the active selection
   */
  private preventNewSelections(): void {
    if (this.activeSelection && this.richTextEditor?.editor) {
      // Restore the active selection
      this.richTextEditor.editor.commands.setTextSelection({
        from: this.activeSelection.start,
        to: this.activeSelection.end
      });
      
      // Re-apply the highlight to ensure it's visible
      if (!this.selectionHighlighted) {
        this.highlightSelectedText();
      }
    }
  }
  
  /**
   * Calculate the position for the inline edit controls
   */
  calculateInlineEditPosition(): void {
    if (!this.richTextEditor?.editorElement) return;
    
    try {
      const editorElement = this.richTextEditor.editorElement.nativeElement;
      const selection = window.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Get editor position
        const editorRect = editorElement.getBoundingClientRect();
        
        // Calculate position relative to the editor
        this.inlineEditTop = rect.bottom - editorRect.top;
        this.inlineEditLeft = rect.left - editorRect.left + (rect.width / 2);
      }
    } catch (error) {
      this.logger.error('Error calculating inline edit position:', error);
    }
  }
  
  /**
   * Generate a section ID from a title
   */
  private generateSectionId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  /**
   * Handle content changes from the rich text editor
   */
  onContentChange(content: string): void {
    this.content = content;
    this.contentChange.emit(content);
    this.parseContentSections();
  }
  
  /**
   * Search for text in the document and replace it with new text
   * @param searchText The text to search for
   * @param replaceText The text to replace it with
   */
  searchAndReplaceText(searchText: string, replaceText: string): void {
    if (!this.richTextEditor?.editor) return;
    
    // Get the current content
    const content = this.richTextEditor.editor?.getHTML() ?? '';
    
    // Use the document update service to replace the text block
    this.documentUpdateService.applyUpdate({
      requestId: `search-replace-${Date.now()}`,
      documentId: 'current-document', // Use a generic document ID
      updateType: 'text_block_replace',
      searchBlock: searchText,
      replaceBlock: replaceText
    }).then((response: DocumentUpdateResponse) => {
      if (response.success) {
        // Replace all occurrences of the search text with the replace text
        const updatedContent = content.replace(new RegExp(searchText, 'g'), replaceText);
        
        // Update the editor content
        this.richTextEditor.editor?.commands.setContent(updatedContent);
        
        // Emit the content change event
        this.contentChange.emit(updatedContent);
        
        // Update the document sections
        this.parseContentSections();
      }
    });
  }
  
  /**
   * Request an inline edit for the selected text
   */
  requestInlineEdit(): void {
    if (!this.selectedText || !this.richTextEditor?.editor) {
      this.logger.warn('No text selected for inline edit');
      return;
    }
    
    // Get the current content for context
    const currentContent = this.richTextEditor.editor.getHTML();
    
    // First set inline edit as active - this is important so that the highlighting knows to persist
    this.inlineEditActive = true;
    
    // Store the active selection for persistence
    this.activeSelection = {
      text: this.selectedText,
      start: this.selectionStart,
      end: this.selectionEnd
    };
    
    // Apply highlighting to the selected text that persists when focus is lost
    // Only do this now that we're in inline edit mode
    this.highlightSelectedText();
    
    // Show the inline edit component
    this.inlineEdit.selectedText = this.selectedText;
    this.inlineEdit.editorInstance = this.richTextEditor.editor;
    this.inlineEdit.selectionStart = this.selectionStart;
    this.inlineEdit.selectionEnd = this.selectionEnd;
    this.inlineEdit.context = currentContent;
    this.inlineEdit.positionTop = this.inlineEditTop;
    this.inlineEdit.positionLeft = this.inlineEditLeft;
    this.inlineEdit.defaultPrompt = this.defaultPrompt;
    this.inlineEdit.show();
    
    // Only add the event listener when we're actually in inline edit mode
    document.addEventListener('selectionchange', this.preventSelectionClear, { once: false });
    
    // Hide the controls since we're now in edit mode
    this.showInlineEditControls = false;
  }
  
  /**
   * Prevent the selection from being cleared when focus changes, but only during inline edit
   */
  private preventSelectionClear = (e: Event): void => {
    // Only preserve selection when inline edit is active
    if (this.inlineEditActive && this.activeSelection) {
      // Re-apply the highlight if it gets removed
      if (!this.selectionHighlighted) {
        this.highlightSelectedText();
      }
    }
  }
  
  /**
   * Check if we're in editing mode that should block normal operations
   * This is only true after the sparkle button has been clicked
   */
  private isInRestrictedEditMode(): boolean {
    // Only restrict operations when inline edit is active AND the inline edit component is showing
    return this.inlineEditActive && this.inlineEdit?.isActive;
  }
  
  /**
   * Highlight the selected text to keep it visible during inline editing
   * Uses a more reliable approach with element overlays
   */
  private highlightSelectedText(): void {
    if (!this.richTextEditor?.editor || this.selectionStart === this.selectionEnd) {
      return;
    }
    
    const editor = this.richTextEditor.editor;
    
    try {
      // Remove any existing highlight first
      this.removeHighlight();
      
      // First apply a class to the whole editor to indicate inline edit mode
      if (this.richTextEditor.editorElement) {
        this.richTextEditor.editorElement.nativeElement.classList.add('inline-edit-active');
      }
      
      // Create a more reliable highlight using multiple techniques
      
      // 1. Use TipTap's native approach for marking text (works for simple selections)
      editor.commands.setTextSelection({
        from: this.selectionStart,
        to: this.selectionEnd
      });
      
      // Apply the highlight mark with our custom class
      editor.commands.setMark('highlight', { class: 'inline-edit-selection' });
      
      // 2. Create an overlay div that exactly covers the selection (works for complex selections)
      this.createOverlayHighlight();
      
      // 3. Store selection data for later restoration
      if (editor.storage) {
        editor.storage['inlineEditSelection'] = {
          from: this.selectionStart,
          to: this.selectionEnd,
          text: this.selectedText
        };
      }
      
      // 4. For complex selections (spanning multiple nodes), we'll add background styling
      // to each text node within the selection
      setTimeout(() => {
        try {
          this.highlightTextNodesInRange();
        } catch (e) {
          this.logger.warn('Error highlighting text nodes:', e);
        }
      }, 10);
      
      // Set the flag to indicate highlight is active
      this.selectionHighlighted = true;
    } catch (error) {
      this.logger.error('Error highlighting selected text:', error);
    }
  }
  
  /**
   * Highlight individual text nodes in the selection range
   * This handles complex selections spanning multiple DOM nodes
   */
  private highlightTextNodesInRange(): void {
    if (!this.richTextEditor?.editorElement) return;
    
    try {
      const editorElement = this.richTextEditor.editorElement.nativeElement;
      const editor = this.richTextEditor.editor;
      
      // Get all text nodes within the editor
      const walker = document.createTreeWalker(
        editorElement, 
        NodeFilter.SHOW_TEXT,
        null
      );
      
      const textNodes: Text[] = [];
      let currentNode = walker.nextNode();
      
      // Collect all text nodes
      while (currentNode) {
        textNodes.push(currentNode as Text);
        currentNode = walker.nextNode();
      }
      
      // Highlight nodes that are within our selection range
      let nodePosition = 0;
      const highlightedElements: HTMLElement[] = [];
      
      textNodes.forEach(textNode => {
        // Check if this node's text is part of the selection
        if (textNode.textContent) {
          const nodeLength = textNode.textContent.length;
          const nodeStart = nodePosition;
          const nodeEnd = nodePosition + nodeLength;
          
          // If this node overlaps with our selection
          if (!(nodeEnd <= this.selectionStart || nodeStart >= this.selectionEnd)) {
            // Create a span wrapper
            const wrapper = document.createElement('span');
            wrapper.className = 'inline-edit-selection-node';
            wrapper.style.backgroundColor = 'rgba(59, 130, 246, 0.35)';
            wrapper.style.borderBottom = '1px dotted rgba(59, 130, 246, 0.8)';
            
            // Replace the text node with our wrapped version
            const parent = textNode.parentNode;
            if (parent) {
              parent.insertBefore(wrapper, textNode);
              wrapper.appendChild(textNode);
              highlightedElements.push(wrapper);
            }
          }
          
          nodePosition += nodeLength;
        }
      });
      
      // Store references for cleanup
      if (this.selectionMarker) {
        if (Array.isArray(this.selectionMarker)) {
          this.selectionMarker.push(...highlightedElements);
        } else {
          this.selectionMarker = [...highlightedElements];
        }
      } else {
        this.selectionMarker = highlightedElements;
      }
    } catch (e) {
      this.logger.warn('Error highlighting text nodes in range:', e);
    }
  }
  
  /**
   * Create an overlay element to highlight the selected text
   * This is a reliable approach that works in all browsers
   */
  private createOverlayHighlight(): void {
    try {
      if (!this.richTextEditor?.editorElement) return;
      
      const editorElement = this.richTextEditor.editorElement.nativeElement;
      
      // Create or find our overlay container
      let overlayContainer = editorElement.querySelector('.selection-overlay-container');
      if (!overlayContainer) {
        overlayContainer = document.createElement('div');
        overlayContainer.className = 'selection-overlay-container';
        overlayContainer.style.position = 'relative';
        overlayContainer.style.pointerEvents = 'none';
        overlayContainer.style.zIndex = '1000';
        editorElement.appendChild(overlayContainer);
      }
      
      // Remove any existing overlays
      while (overlayContainer.firstChild) {
        overlayContainer.removeChild(overlayContainer.firstChild);
      }
      
      // Create selection element
      const selectionEl = document.createElement('div');
      selectionEl.className = 'inline-edit-selection-overlay';
      selectionEl.style.position = 'absolute';
      selectionEl.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
      selectionEl.style.borderBottom = '1px dotted rgba(59, 130, 246, 0.7)';
      selectionEl.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
      selectionEl.style.pointerEvents = 'none';
      selectionEl.style.zIndex = '50';
      
      // Calculate position based on editor coordinates and the selection rectangle
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorElement.getBoundingClientRect();
        
        // Position the element directly over the selected text
        selectionEl.style.top = `${rect.top - editorRect.top}px`;
        selectionEl.style.left = `${rect.left - editorRect.left}px`;
        selectionEl.style.width = `${rect.width}px`;
        selectionEl.style.height = `${rect.height}px`;
      } else {
        // Fallback if selection is not available
        selectionEl.style.top = `${this.inlineEditTop - 16}px`;
        selectionEl.style.left = `${this.inlineEditLeft - 50}px`;
        selectionEl.style.width = '100px';
        selectionEl.style.height = '16px';
      }
      
      // Add to container
      overlayContainer.appendChild(selectionEl);
      
      // Store reference for cleanup
      this.selectionMarker = selectionEl;
    } catch (error) {
      this.logger.warn('Error creating overlay highlight:', error);
    }
  }
  
  /**
   * Remove the highlight from the previously selected text
   */
  removeHighlight(): void {
    if (!this.richTextEditor?.editor) {
      return;
    }
    
    try {
      const editor = this.richTextEditor.editor;
      
      // 1. Remove any highlight marks from the editor content
      editor.commands.unsetMark('highlight');
      
      // 2. Remove the overlay elements if they exist
      if (this.selectionMarker) {
        // Handle both single element and array of elements
        if (Array.isArray(this.selectionMarker)) {
          // Handle array of elements
          this.selectionMarker.forEach(marker => {
            if (marker && marker.parentNode) {
              marker.parentNode.removeChild(marker);
            }
          });
        } else if (this.selectionMarker.parentNode) {
          // Handle single element
          this.selectionMarker.parentNode.removeChild(this.selectionMarker);
        }
        this.selectionMarker = null;
      }
      
      // 3. Remove any overlay container we might have created
      if (this.richTextEditor.editorElement) {
        const editorElement = this.richTextEditor.editorElement.nativeElement;
        const overlayContainer = editorElement.querySelector('.selection-overlay-container');
        if (overlayContainer && overlayContainer.parentNode) {
          overlayContainer.parentNode.removeChild(overlayContainer);
        }
      }
      
      // 4. Remove any spans with our special classes that were added directly to the content
      if (this.richTextEditor.editorElement) {
        const editorElement = this.richTextEditor.editorElement.nativeElement;
        
        // Remove the editor-wide class
        editorElement.classList.remove('inline-edit-active');
        
        // Clean up persistent highlight spans
        const persistentHighlights = editorElement.querySelectorAll('.inline-edit-selection-persistent');
        persistentHighlights.forEach((el: Element) => {
          // Replace the highlight span with its contents to preserve the text
          if (el.parentNode) {
            while (el.firstChild) {
              el.parentNode.insertBefore(el.firstChild, el);
            }
            el.parentNode.removeChild(el);
          }
        });
        
        // Clean up node-level highlight spans
        const nodeHighlights = editorElement.querySelectorAll('.inline-edit-selection-node');
        nodeHighlights.forEach((el: Element) => {
          // Replace the highlight span with its contents to preserve the text
          if (el.parentNode) {
            while (el.firstChild) {
              el.parentNode.insertBefore(el.firstChild, el);
            }
            el.parentNode.removeChild(el);
          }
        });
      }
      
      // Reset the highlight flag
      this.selectionHighlighted = false;
    } catch (error) {
      this.logger.error('Error removing text highlight:', error);
    }
  }
  
  /**
   * Select a specific section programmatically and scroll to it
   * @param sectionId The ID of the section to select
   */
  selectSection(sectionId: string): void {
    try {
      const section = this.sections.find(s => s.id === sectionId);
      if (!section || !this.richTextEditor?.editor) return;
      
      // Set the selection to the beginning of the section
      this.richTextEditor.editor.commands.setTextSelection({
        from: section.startPos,
        to: section.startPos
      });
      
      // Update the selected section state
      this.selectedSection = section;
      this.sectionSelected.emit(section);
      
      // Scroll to the section with a small delay to ensure the editor has updated
      this.scrollToSection(section);
    } catch (error) {
      this.logger.error('Error selecting section:', error);
    }
  }
  
  /**
   * Scroll to a specific section in the editor
   * @param section The section to scroll to
   */
  private scrollToSection(section: SectionInfo | null): void {
    if (!section) return;
    setTimeout(() => {
      try {
        // Get the editor element
        if (!this.richTextEditor?.editor || !this.richTextEditor.editorElement) return;
        const editorElement = this.richTextEditor.editorElement.nativeElement;
        if (!editorElement) return;
        
        // First try to find an element with the exact section ID
        let targetElement: HTMLElement | null = document.getElementById(section.id);
        
        // If not found, try to find a heading with matching text content
        if (!targetElement) {
          const headings = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
          
          for (let i = 0; i < headings.length; i++) {
            const heading = headings[i] as HTMLElement;
            const headingText = heading.textContent || '';
            if (headingText && headingText.includes(section.title)) {
              targetElement = heading;
              break;
            }
          }
        }
        
        // If we found a target element, scroll to it
        if (targetElement) {
          // Find the scrollable container
          const scrollContainer = editorElement.closest('.overflow-y-auto') || editorElement;
          
          if (scrollContainer instanceof HTMLElement) {
            // Scroll with smooth behavior
            scrollContainer.scrollTo({
              top: targetElement.offsetTop - 50, // Add padding at the top
              behavior: 'smooth'
            });
          }
        }
      } catch (error) {
        this.logger.error('Error scrolling to section:', error);
      }
    }, 100);
  }
  
  /**
   * Refresh the content of the editor
   * This method is called when the content is updated externally
   */
  refreshContent(): void {
    if (!this.richTextEditor?.editor) return;
    
    try {
      // Re-parse the content sections
      this.parseContentSections();
      
      // Refresh the editor view
      const currentContent = this.richTextEditor.editor.getHTML();
      this.richTextEditor.editor.commands.setContent(currentContent);
      
      // Emit the content change event
      this.contentChange.emit(currentContent);
    } catch (error) {
      this.logger.error('Error refreshing content:', error);
    }
  }
  
  /**
   * Reset the inline edit state when an edit is cancelled
   * This ensures the component is ready for a new edit operation
   */
  resetInlineEditState(): void {
    // Remove event listeners
    document.removeEventListener('selectionchange', this.preventSelectionClear);
    
    // Reset active selection
    this.activeSelection = null;
    
    // Reset selection highlight flags
    this.selectionHighlighted = false;
    
    // Set inline edit inactive
    this.inlineEditActive = false;
    
    // Show the controls for new selections
    this.showInlineEditControls = true;
    
    // Allow the editor to regain focus
    setTimeout(() => {
      if (this.richTextEditor?.editor) {
        this.richTextEditor.editor.commands.focus();
      }
    }, 50);
  }
  
  // Store references to the event handlers we add
  private mousedownHandler: ((event: MouseEvent) => void) | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  
  // Set up the event handlers with stored references for cleanup
  private setupEditorEventListeners(): void {
    if (!this.richTextEditor?.editor) return;
    
    const editorDom = this.richTextEditor.editor.view.dom;
    
    // Create and store the mousedown handler
    this.mousedownHandler = (event: MouseEvent) => {
      if (this.inlineEditActive && this.inlineEdit?.isActive) {
        // Don't prevent clicks on the inline edit controls themselves
        const target = event.target as HTMLElement;
        const clickedOnInlineEdit = target.closest('app-inline-edit') !== null;
        
        if (!clickedOnInlineEdit) {
          // Prevent the default behavior which would start a new selection
          event.preventDefault();
          event.stopPropagation();
          
          // Keep the current selection
          this.preventNewSelections();
        }
      }
    };
    
    // Create and store the keydown handler
    this.keydownHandler = (event: KeyboardEvent) => {
      if (this.inlineEditActive && this.inlineEdit?.isActive) {
        // Allow keys in the inline edit component
        const target = event.target as HTMLElement;
        const keyInInlineEdit = target.closest('app-inline-edit') !== null;
        
        // List of keys that could change selection like arrow keys with shift, etc.
        const selectionKeys = [
          'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
          'Home', 'End', 'PageUp', 'PageDown'
        ];
        
        if (!keyInInlineEdit && (event.shiftKey || selectionKeys.includes(event.key))) {
          // Prevent keyboard-based selection changes
          event.preventDefault();
          event.stopPropagation();
          
          // Keep the current selection
          this.preventNewSelections();
        }
      }
    };
    
    // Add the event listeners
    editorDom.addEventListener('mousedown', this.mousedownHandler);
    editorDom.addEventListener('keydown', this.keydownHandler);
  }
  
  ngAfterViewInit(): void {
    // Wait for the rich text editor to initialize
    setTimeout(() => {
      this.parseContentSections();
      this.setupSelectionHandler();
      this.setupEditorEventListeners(); // Add the event listeners
    }, 500);
  }
  
  ngOnDestroy(): void {
    // Clean up event listeners
    document.removeEventListener('selectionchange', this.preventSelectionClear);
    
    // Clean up mouse and keyboard event listeners using stored references
    if (this.richTextEditor?.editor) {
      const editorDom = this.richTextEditor.editor.view.dom;
      
      if (this.mousedownHandler) {
        editorDom.removeEventListener('mousedown', this.mousedownHandler);
      }
      
      if (this.keydownHandler) {
        editorDom.removeEventListener('keydown', this.keydownHandler);
      }
    }
    
    // Remove any lingering highlights
    if (this.selectionHighlighted && this.richTextEditor?.editor) {
      this.removeHighlight();
    }
    
    this.subscriptions.unsubscribe();
  }
}
