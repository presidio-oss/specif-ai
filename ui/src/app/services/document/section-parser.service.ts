import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { SectionInfo, generateSectionId } from 'src/app/utils/section.utils';
import { Editor } from '@tiptap/core';

@Injectable({
  providedIn: 'root'
})
export class SectionParserService {
  
  constructor(private logger: NGXLogger) {}
  
  /**
   * Parse the content into sections based on markdown headings
   * This method analyzes the document structure to identify sections
   */
  parseContentSections(editor: Editor): SectionInfo[] {
    if (!editor) {
      return [];
    }
    
    const doc = editor.state.doc;
    const sections: SectionInfo[] = [];
    
    try {
      // Track heading positions to identify sections
      const headingPositions: {pos: number, title: string, id: string}[] = [];
      
      // First pass: find all headings in the document
      doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const title = node.textContent;
          const id = generateSectionId(title);
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
      
      return sections;
    } catch (error) {
      this.logger.error('Error parsing document sections:', error);
      // Fallback to a single section if parsing fails
      return [{
        id: 'document',
        title: 'Document',
        content: editor.getHTML(),
        startPos: 0,
        endPos: doc.content.size
      }];
    }
  }

}
