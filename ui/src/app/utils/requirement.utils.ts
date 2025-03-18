import { truncateMarkdown } from './markdown.utils';

interface MainSection {
  type: 'main';
  content: string;
}

interface NamedSection {
  type: 'section';
  headingLevel: number;
  sectionName: string;
  content: string;
}

type Section = MainSection | NamedSection;

interface SectionInfo {
  index: number;
  headingLevel?: number;
}

// Helper function to find section in content
const findSection = (
  content: string,
  sectionName: string,
): SectionInfo | null => {
  if (!content || !sectionName) return null;

  // Find all heading matches with proper markdown heading format
  const headingMatches = Array.from(
    content.matchAll(/^(#{1,6})[\s\t]+([^\n:]+:)[\s\t]*$/gm),
  )
    .filter((match) => {
      const headingText = match[2]?.trim();
      return headingText === sectionName;
    })
    .sort((a, b) => (b[1]?.length || 0) - (a[1]?.length || 0)); // Sort by heading level (most specific first)

  // If we found any valid heading matches, return the most specific one with its heading level
  if (
    headingMatches.length > 0 &&
    typeof headingMatches[0].index === 'number'
  ) {
    return {
      index: headingMatches[0].index,
      headingLevel: headingMatches[0][1].length,
    };
  }

  // Fall back to plain text search without heading level
  const index = content.indexOf(sectionName);
  return index !== -1 ? { index } : null;
};

// Helper function to split content into sections
const splitContent = (
  content: string,
  sectionNames: Array<string>,
): Section[] => {
  const sections = sectionNames
    .map((sectionName) => ({
      name: sectionName,
      info: findSection(content, sectionName),
    }))
    .filter(
      (section): section is { name: string; info: SectionInfo } =>
        section.info !== null,
    )
    .sort((a, b) => a.info.index - b.info.index);

  const result: Section[] = [];

  if (sections.length === 0) {
    // Only main content
    result.push({
      type: 'main',
      content: content.trim(),
    });
    return result;
  }

  // Add main content (content before first section)
  const mainContent = content.substring(0, sections[0].info.index).trim();
  if (mainContent) {
    result.push({
      type: 'main',
      content: mainContent,
    });
  }

  // Extract other sections
  sections.forEach((section, idx) => {
    const nextIndex =
      idx < sections.length - 1 ? sections[idx + 1].info.index : content.length;

    // Include the heading in the section content
    if (section.info.index < nextIndex) {
      const sectionText = content
        .substring(section.info.index, nextIndex)
        .trim();

      // We already know the section name and if it has a heading
      const sectionContent = section.info.headingLevel
        ? sectionText
            .replace(
              new RegExp(
                `^#{${section.info.headingLevel}}\\s+${section.name}\\s*`,
              ),
              '',
            )
            .trim()
        : sectionText.replace(new RegExp(`^${section.name}\\s*`), '').trim();

      result.push({
        type: 'section',
        headingLevel: 4,
        sectionName: section.name,
        content: sectionContent,
      });
    }
  });

  return result;
};

// Helper function to truncate text
const truncateText = (text: string, maxChars: number): string => {
  return truncateMarkdown(text, { maxChars, ellipsis: true });
};

// Helper function to combine sections
const combineSections = (sections: Section[]): string => {
  return sections
    .map((section) => {
      if (section.type === 'main') {
        return section.content;
      } else {
        // Always use heading level 4 for sections without a heading level
        const heading = '#'.repeat(section.headingLevel);
        // Ensure content is on a new line and properly spaced
        return section.content
          ? `${heading} ${section.sectionName}\n${section.content}`
          : `${heading} ${section.sectionName}`;
      }
    })
    .filter((content) => content.length > 0)
    .join('\n\n');
};

export const processRequirementContentForView = (
  content: string,
  options: {
    maxChars?: number;
    sectionNames?: Array<string>;
  },
): string => {
  if (!content) {
    return content;
  }

  const { maxChars, sectionNames = [] } = options;

  // Split content into sections
  let sections = splitContent(content, sectionNames);

  if (maxChars) {
    // Truncate each section's content while preserving headers
    sections = sections.map((section) => {
      if (section.type === 'main') {
        return {
          ...section,
          content: truncateText(section.content, maxChars),
        };
      } else {
        return {
          ...section,
          content: truncateText(section.content, maxChars),
        };
      }
    });
  }

  // Combine truncated sections
  return combineSections(sections);
};
