import markdownit from 'markdown-it';
const mdit = markdownit();
// @ts-expect-error no types
import truncateMarkdownLib from 'markdown-truncate';

export type MarkdownToHtmlOptions = {
  maxChars?: number;
};

/**
 * Convert markdown to HTML
 * @param mdInput Markdown input string
 * @param options Options for conversion
 * @returns HTML string
 */
const markdownToHtml = (
  mdInput: string,
  options: MarkdownToHtmlOptions = {},
) => {
  try {
    const { maxChars } = options;
    let md = mdInput;

    if (maxChars) {
      md = truncateMarkdown(mdInput, { maxChars: maxChars, ellipsis: true });
    }
    const html = mdit.render(md ?? '');
    return html;
  } catch (error) {
    console.error(error);
    return '';
  }
};

/**
 * Truncate markdown to a specified number of characters
 * @param md Markdown input string
 * @param param1 Options for truncation
 * @returns Truncated markdown string
 */
const truncateMarkdown = (
  md: string,
  { maxChars, ellipsis = true }: { maxChars: number; ellipsis?: boolean },
) => {
  return truncateMarkdownLib(md, {
    limit: maxChars,
    ellipsis,
  });
};

/**
 * Enum for Word document file extensions
 */
export enum WordFileExtension {
  DOC = 'doc',
  DOCX = 'docx'
}

/**
 * Export markdown content to a Word document (DOC format)
 * @param markdownContent The markdown content to export
 * @param title The title of the document
 * @param options Additional options for the export
 * @returns A Promise that resolves when the export is complete
 */
export interface ExportToDocxOptions {
  /** CSS styles to apply to the document */
  styles?: string;
  /** File extension (default: WordFileExtension.DOC) */
  fileExtension?: WordFileExtension;
}

const exportMarkdownToDocx = (
  markdownContent: string,
  title: string,
  options: ExportToDocxOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Convert markdown to HTML
      const htmlBody = mdit.render(markdownContent || '');
      
      // Default styles for the document
      const defaultStyles = `
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2563eb; font-size: 24px; margin-top: 24px; margin-bottom: 16px; }
        h2 { color: #1e40af; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-top: 20px; margin-bottom: 14px; }
        h3 { color: #1e3a8a; font-size: 18px; margin-top: 18px; margin-bottom: 12px; }
        h4 { color: #1e429f; font-size: 16px; margin-top: 16px; margin-bottom: 10px; }
        p { margin-bottom: 10px; line-height: 1.5; }
        ul, ol { margin-bottom: 10px; padding-left: 20px; }
        li { margin-bottom: 5px; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; }
        code { font-family: Consolas, Monaco, 'Courier New', monospace; background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; }
        pre { background-color: #f3f4f6; padding: 10px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #e5e7eb; padding-left: 10px; margin-left: 0; color: #4b5563; }
        hr { border: 0; height: 1px; background-color: #e5e7eb; margin: 20px 0; }
        a { color: #2563eb; text-decoration: underline; }
      `;
      
      // Combine user styles with default styles
      const styles = options.styles ? `${defaultStyles}\n${options.styles}` : defaultStyles;
      
      // Create Word-compatible HTML with enhanced compatibility
      const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset='utf-8'>
            <meta name="ProgId" content="Word.Document">
            <meta name="Generator" content="Microsoft Word 15">
            <meta name="Originator" content="Microsoft Word 15">
            <title>${title}</title>
            <style>
              ${styles}
            </style>
            <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>100</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
              </w:WordDocument>
            </xml>
            <![endif]-->
          </head>
          <body>
            <h1>${title}</h1>
            ${htmlBody}
          </body>
        </html>
      `;
      
      // Use the original HTML approach with DOC format (works with MS Word)
      const mimeType = 'application/msword';
      const blob = new Blob([wordHtml], { type: mimeType });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, '_')}.doc`;
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      resolve();
    } catch (error) {
      console.error('Error exporting document:', error);
      reject(error);
    }
  });
};

export { markdownToHtml, truncateMarkdown, exportMarkdownToDocx };
