/**
 * Utility functions for handling document sections
 */

/**
 * Represents a section in a document
 */
export interface SectionInfo {
  /** Unique identifier for the section */
  id: string;
  /** Title of the section */
  title: string;
  /** Content of the section */
  content: string;
  /** Start position in the document */
  startPos: number;
  /** End position in the document */
  endPos: number;
}

/**
 * Parse markdown content into sections based on headings
 * @param content The markdown content to parse
 * @returns An array of section information
 */
export function parseMarkdownSections(content: string): SectionInfo[] {
  if (!content) {
    return [];
  }
  
  const sections: SectionInfo[] = [];
  
  // Add a default section for content before the first heading
  const introEndPos = content.indexOf('##');
  const introContent = introEndPos > -1 ? content.substring(0, introEndPos).trim() : content.trim();
  
  if (introContent) {
    // Try to extract a title from the first paragraph or use "Introduction"
    let sectionTitle = "Introduction";
    const firstLineEnd = introContent.indexOf('\n');
    if (firstLineEnd > 0) {
      const firstLine = introContent.substring(0, firstLineEnd).trim();
      // If the first line looks like a title (not too long, no markdown)
      if (firstLine.length < 50 && !firstLine.includes('*') && !firstLine.includes('[')) {
        sectionTitle = firstLine;
      }
    }
    
    sections.push({
      id: 'introduction',
      title: sectionTitle,
      content: introContent,
      startPos: 0,
      endPos: introEndPos > -1 ? introEndPos : content.length
    });
  }
  
  // Extract sections based on ## headings using regex
  const regex = /##\s+([^\n]+)/g;
  let match;
  let sectionStartPositions: {title: string, pos: number}[] = [];
  
  // First, collect all section headings and their positions
  while ((match = regex.exec(content)) !== null) {
    sectionStartPositions.push({
      title: match[1].trim(),
      pos: match.index
    });
  }
  
  // Then create section objects with proper start and end positions
  for (let i = 0; i < sectionStartPositions.length; i++) {
    const { title, pos: startPos } = sectionStartPositions[i];
    const endPos = i < sectionStartPositions.length - 1 
      ? sectionStartPositions[i + 1].pos 
      : content.length;
    
    const sectionContent = content.substring(startPos, endPos);
    
    sections.push({
      id: generateSectionId(title),
      title,
      content: sectionContent,
      startPos,
      endPos
    });
  }
  
  return sections;
}

/**
 * Generate a section ID from a title
 * @param title The section title
 * @returns A URL-friendly ID
 */
export function generateSectionId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Find a section by its ID
 * @param sections Array of sections to search
 * @param sectionId ID of the section to find
 * @returns The found section or null if not found
 */
export function findSectionById(sections: SectionInfo[], sectionId: string): SectionInfo | null {
  return sections.find(s => s.id === sectionId) || null;
}

/**
 * Find the section that contains a specific position
 * @param sections Array of sections to search
 * @param position Position in the document
 * @returns The section containing the position or null if not found
 */
export function findSectionByPosition(sections: SectionInfo[], position: number): SectionInfo | null {
  return sections.find(s => position >= s.startPos && position <= s.endPos) || null;
}

/**
 * Replace a section in the content
 * @param content The full document content
 * @param section The section to replace
 * @param newContent The new content for the section
 * @returns The updated document content
 */
export function replaceSection(content: string, section: SectionInfo, newContent: string): string {
  return content.substring(0, section.startPos) + newContent + content.substring(section.endPos);
}

/**
 * Append content to the end of a document
 * @param content The original document content
 * @param newContent The content to append
 * @returns The updated document content
 */
export function appendContent(content: string, newContent: string): string {
  return `${content}\n\n${newContent}`;
}
