import { htmlToMarkdown } from "../../utils/html.utils";
import { markdownToHtml } from "../../utils/markdown.utils";


export function convertMarkdownToHtml(markdown: string): string {
  try {
    return markdownToHtml(markdown);
  } catch (error) {
    console.error('Error converting Markdown to HTML:', error);
    return markdown; // Return original markdown as fallback
  }
}

export async function convertHtmlToMarkdown(html: string): Promise<string> {
  try {
    const result = await htmlToMarkdown(html);
    return String(result);
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    return html; // Return original HTML as fallback
  }
}
