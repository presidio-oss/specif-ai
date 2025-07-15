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
  heroPencil,
} from '@ng-icons/heroicons/outline';
import { Subscription } from 'rxjs';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { DocumentSectionsComponent } from '../document-sections/document-sections.component';
import { NGXLogger } from 'ngx-logger';
import { SectionParserService } from 'src/app/services/document/section-parser.service';
import { SectionInfo } from 'src/app/utils/section.utils';

export interface EditProposal {
  type: 'append' | 'section' | 'full' | 'inline';
  content: string;
  sectionToReplace?: string;
  selectionText?: string;
  selectionStart?: number;
  selectionEnd?: number;
}

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
    DocumentSectionsComponent
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
  
  // Public method to get editor safely
  public getEditor(): any {
    return this.richTextEditor?.editor || null;
  }
  
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
  
  private subscriptions: Subscription = new Subscription();
  
  constructor(
    private logger: NGXLogger,
    private sectionParserService: SectionParserService
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
   * This method uses the section parser service to analyze the document structure
   */
  parseContentSections(): void {
    if (!this.richTextEditor?.editor) return;
    
    // Use the section parser service to parse the content
    const parsedSections = this.sectionParserService.parseContentSections(this.richTextEditor.editor);
    this.sections = parsedSections;
    
    // If we have a selected section, make sure it's still valid after parsing
    if (this.selectedSection) {
      const sectionStillExists = parsedSections.some(s => s.id === this.selectedSection?.id);
      if (!sectionStillExists && parsedSections.length > 0) {
        this.selectedSection = parsedSections[0];
        this.sectionSelected.emit(this.selectedSection);
      }
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
      const { from, to } = editor.state.selection;
      
      // Store the selected text and position
      if (from !== to) {
        this.selectedText = editor.state.doc.textBetween(from, to);
        this.selectionStart = from;
        this.selectionEnd = to;
      } else {
        this.selectedText = '';
        this.selectionStart = 0;
        this.selectionEnd = 0;
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
   * Handle content changes from the rich text editor
   */
  onContentChange(content: string): void {
    this.content = content;
    this.contentChange.emit(content);
    this.parseContentSections();
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
  
  ngAfterViewInit(): void {
    // Wait for the rich text editor to initialize
    setTimeout(() => {
      this.parseContentSections();
      this.setupSelectionHandler();
    }, 500);
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
