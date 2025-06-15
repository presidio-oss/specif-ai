import { JSONTransformer } from '@atlaskit/editor-json-transformer';
import { MarkdownTransformer } from '@atlaskit/editor-markdown-transformer';
import { Observable, of } from 'rxjs';

const atlasMarkdownTransformer = new MarkdownTransformer();
const atlasJsonTransformer = new JSONTransformer();


export function convertMarkdownToADF(markdown: string): Observable<any> {
  return of(
    atlasJsonTransformer.encode(atlasMarkdownTransformer.parse(markdown))
  );
}

export function convertADFToMarkdown(adfContent: any): Observable<string> {
  try {
    if (!adfContent) {
      return of('');
    }

    if (typeof adfContent === 'string') {
      return of(adfContent);
    }

    if (!adfContent.content && !adfContent.type) {
      return of('');
    }

    // Combined logic from customADFToMarkdown
    if (adfContent.type === 'doc' && adfContent.content) {
      return of(processADFNodes(adfContent.content));
    }

    if (Array.isArray(adfContent)) {
      return of(processADFNodes(adfContent));
    }

    if (adfContent.type) {
      return of(processADFNode(adfContent));
    }

    if (adfContent.content) {
      return of(processADFNodes(adfContent.content));
    }

    return of('');

  } catch (error) {
    console.error('Error converting ADF to Markdown:', error);
    const fallbackText = extractPlainTextFromADF(adfContent);
    return of(fallbackText);
  }
}

export function compareADFContent(content1: any, content2: any): boolean {
  const content1Copy = { ...content1 };
  const content2Copy = { ...content2 };
  delete content1Copy.version;
  delete content2Copy.version;
  return JSON.stringify(content1Copy) === JSON.stringify(content2Copy);
}

function processADFNodes(nodes: any[]): string {
  if (!Array.isArray(nodes)) {
    return '';
  }

  return nodes.map(node => processADFNode(node)).join('');
}

function processADFNode(node: any): string {
  if (!node || !node.type) {
    return '';
  }

  switch (node.type) {
    case 'doc':
      return node.content ? processADFNodes(node.content) : '';

    case 'paragraph':
      const content = node.content ? processADFNodes(node.content) : '';
      // Handle alignment mark
      if (node.marks) {
        const alignMark = node.marks.find((mark: any) => mark.type === 'alignment');
        if (alignMark && alignMark.attrs?.align === 'center') {
          return `<div align="center">${content.trim()}</div>\n\n`;
        }
      }
      return content.trim() ? content + '\n\n' : '';

    case 'text':
      let text = node.text || '';

      // Apply marks (formatting)
      if (node.marks && Array.isArray(node.marks)) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'strong':
              text = `**${text}**`;
              break;
            case 'em':
              text = `*${text}*`;
              break;
            case 'code':
              text = `\`${text}\``;
              break;
            case 'link':
              const href = mark.attrs?.href || '';
              text = `[${text}](${href})`;
              break;
            case 'underline':
              text = `<u>${text}</u>`;
              break;
            case 'strike':
              text = `~~${text}~~`;
              break;
            case 'subsup':
              if (mark.attrs?.type === 'sub') {
                text = `<sub>${text}</sub>`;
              } else if (mark.attrs?.type === 'sup') {
                text = `<sup>${text}</sup>`;
              }
              break;
            case 'textColor':
              const color = mark.attrs?.color;
              if (color) {
                text = `<span style="color: ${color}">${text}</span>`;
              }
              break;
            case 'border':
              // Border mark - not standard markdown, use HTML
              text = `<span style="border: 1px solid #ccc; padding: 2px;">${text}</span>`;
              break;
          }
        });
      }
      return text;

    case 'heading':
      const level = Math.min(Math.max(node.attrs?.level || 1, 1), 6);
      const headingText = node.content ? processADFNodes(node.content) : '';
      return '#'.repeat(level) + ' ' + headingText.trim() + '\n\n';

    case 'bulletList':
      const bulletItems = node.content ? processADFNodes(node.content) : '';
      return bulletItems;

    case 'orderedList':
      const orderedItems = node.content ? processADFNodes(node.content) : '';
      return orderedItems;

    case 'listItem':
      const itemContent = node.content ? processADFNodes(node.content) : '';
      return '- ' + itemContent.trim().replace(/\n\n$/, '') + '\n';

    case 'codeBlock':
      const language = node.attrs?.language || '';
      const codeContent = node.content ? processADFNodes(node.content) : '';
      return '```' + language + '\n' + codeContent.trim() + '\n```\n\n';

    case 'blockquote':
      const quoteContent = node.content ? processADFNodes(node.content) : '';
      const quotedLines = quoteContent.trim().split('\n').map(line => `> ${line}`).join('\n');
      return quotedLines + '\n\n';

    case 'hardBreak':
      return '\n';

    case 'rule':
      return '\n---\n\n';

    case 'table':
      return processTable(node);

    case 'tableRow':
      const cells = node.content || [];
      const cellContents = cells.map((cell: any) => {
        const cellText = processADFNode(cell).trim().replace(/\n/g, ' ');
        return cellText || ' ';
      });
      return '| ' + cellContents.join(' | ') + ' |\n';

    case 'tableHeader':
    case 'tableCell':
      return node.content ? processADFNodes(node.content) : '';

    case 'mention':
      const mentionText = node.attrs?.text || node.attrs?.displayName || '@unknown';
      return `@${mentionText}`;

    case 'emoji':
      return node.attrs?.shortName || node.attrs?.text || ':emoji:';

    case 'date':
      const timestamp = node.attrs?.timestamp;
      if (timestamp) {
        try {
          return new Date(parseInt(timestamp)).toLocaleDateString();
        } catch {
          return '[Date]';
        }
      }
      return '[Date]';

    case 'status':
      const statusText = node.attrs?.text || 'Status';
      return `[${statusText}]`;

    case 'inlineCard':
      const inlineUrl = node.attrs?.url || '';
      return inlineUrl ? `[${inlineUrl}](${inlineUrl})` : '';

    case 'mediaGroup':
    case 'mediaSingle':
      return processMediaNode(node);

    case 'media':
      const mediaUrl = node.attrs?.url || node.attrs?.id || '';
      const mediaAlt = node.attrs?.alt || 'Media';
      return mediaUrl ? `![${mediaAlt}](${mediaUrl})` : '[Media]';

    case 'mediaInline':
      const inlineMediaUrl = node.attrs?.url || node.attrs?.id || '';
      return inlineMediaUrl ? `![Media](${inlineMediaUrl})` : '[Media]';

    case 'panel':
      const panelContent = node.content ? processADFNodes(node.content) : '';
      const panelType = node.attrs?.panelType || 'info';
      return `> **${panelType.toUpperCase()}**\n> \n${panelContent.split('\n').map(line => `> ${line}`).join('\n')}\n\n`;

    case 'expand':
      const expandTitle = node.attrs?.title || 'Details';
      const expandContent = node.content ? processADFNodes(node.content) : '';
      return `<details>\n<summary>${expandTitle}</summary>\n\n${expandContent.trim()}\n</details>\n\n`;

    case 'nestedExpand':
      return node.content ? processADFNodes(node.content) : '';

    case 'multiBodiedExtension':
      // Handle multi-bodied extensions
      return node.content ? processADFNodes(node.content) : '[Extension]';

    case 'extensionFrame':
      // Handle extension frames
      return '[Extension Frame]';

    default:
      console.warn(`Unknown ADF node type: ${node.type}`);
      // Try to extract content from unknown nodes
      if (node.content) {
        return processADFNodes(node.content);
      } else if (node.text) {
        return node.text;
      }
      return '';
  }
}

function processTable(tableNode: any): string {
  if (!tableNode.content || !Array.isArray(tableNode.content)) {
    return '';
  }

  let markdown = '';
  let isFirstRow = true;

  tableNode.content.forEach((row: any) => {
    if (row.type === 'tableRow' && row.content) {
      const cells = row.content.map((cell: any) => {
        const cellContent = processADFNode(cell).trim().replace(/\n/g, ' ');
        return cellContent || ' ';
      });

      markdown += '| ' + cells.join(' | ') + ' |\n';

      // Add header separator after first row
      if (isFirstRow) {
        const separator = cells.map(() => '---');
        markdown += '| ' + separator.join(' | ') + ' |\n';
        isFirstRow = false;
      }
    }
  });

  return markdown + '\n';
}

function processMediaNode(mediaNode: any): string {
  if (mediaNode.content && Array.isArray(mediaNode.content)) {
    return mediaNode.content.map((media: any) => {
      if (media.type === 'media' && media.attrs) {
        const alt = media.attrs.alt || 'Image';
        const url = media.attrs.url || media.attrs.id || '';
        return url ? `![${alt}](${url})` : '[Media]';
      }
      return '[Media]';
    }).join('') + '\n\n';
  }
  return '[Media]\n\n';
}

function extractPlainTextFromADF(adfContent: any): string {
  if (!adfContent) {
    return '';
  }

  if (typeof adfContent === 'string') {
    return adfContent;
  }

  // Extract text from text nodes
  if (adfContent.text) {
    return adfContent.text;
  }

  // Process content array recursively
  if (adfContent.content && Array.isArray(adfContent.content)) {
    return adfContent.content
      .map((node: any) => extractPlainTextFromADF(node))
      .filter((text: string) => text.trim())
      .join(' ');
  }

  // Handle document node
  if (adfContent.type === 'doc' && adfContent.content) {
    return extractPlainTextFromADF({ content: adfContent.content });
  }

  // Extract text from attributes if available
  if (adfContent.attrs) {
    const textFromAttrs = [];
    if (adfContent.attrs.text) textFromAttrs.push(adfContent.attrs.text);
    if (adfContent.attrs.title) textFromAttrs.push(adfContent.attrs.title);
    if (adfContent.attrs.displayName) textFromAttrs.push(adfContent.attrs.displayName);
    if (textFromAttrs.length > 0) {
      return textFromAttrs.join(' ');
    }
  }

  return '';
}