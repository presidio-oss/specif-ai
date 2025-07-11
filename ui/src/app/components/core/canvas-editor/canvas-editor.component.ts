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
  
  private subscriptions: Subscription = new Subscription();
  
  constructor(
    private logger: NGXLogger,
    private electronService: ElectronService,
    private dialog: MatDialog,
    private documentUpdateService: DocumentUpdateService
  ) {}
  
  ngAfterViewInit(): void {
    // Wait for the rich text editor to initialize
    setTimeout(() => {
      this.parseContentSections();
      this.setupSelectionHandler();
    }, 500);
  }
  
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
    
    // Listen for selection changes
    editor.on('selectionUpdate', ({ editor }) => {
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
    });
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
    
    // Store the current selection
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    
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
    
    // Restore the selection to keep the highlight visible
    if (range && selection) {
      // Use setTimeout to ensure this happens after the click event is fully processed
      setTimeout(() => {
        selection.removeAllRanges();
        selection.addRange(range);
      }, 0);
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
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
