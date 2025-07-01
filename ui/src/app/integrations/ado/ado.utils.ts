import { catchError, from, map, Observable, of } from "rxjs";
import { htmlToMarkdown } from "src/app/utils/html.utils";
import { markdownToHtml } from "src/app/utils/markdown.utils";

export interface AdoTokenInfo {
  token: string | null;
  adoURL: string | null;
  projectName: string | null;
  organization: string | null;
}

// For now, using hardcoded values as requested
export function getAdoTokenInfo(projectId: string): AdoTokenInfo {
  // Hardcoded PAT and other values - to be replaced with actual implementation later
  const token = "";
  const adoURL = "";
  const organization = "";
  const projectName = "";

  return {
    token,
    adoURL,
    organization,
    projectName
  };
}

// This will be implemented properly later
export function storeAdoToken(
  token: string,
  projectName: string,
  organization: string,
  projectId: string
): void {
  console.log("ADO token storage to be implemented");
  // Placeholder for future implementation
}

export function resetAdoToken(projectId: string): void {
  console.log("ADO token reset to be implemented");
  // Placeholder for future implementation
}

export function convertMarkdownToHtml(markdown: string): Observable<string> {
  try {
    const html = markdownToHtml(markdown)
    return of(html);
  } catch (error) {
    console.error('Error converting Markdown to HTML:', error);
    return of(markdown); // Return original markdown as fallback
  }
}

export function convertHtmlToMarkdown(html: string): Observable<string> {
  try {
    const markdownPromise = htmlToMarkdown(html);
    return from(markdownPromise).pipe(
      map((value: any) => {
        // Convert the value to string if it's not already
        if (typeof value === 'string') {
          return value;
        } else if (value instanceof Uint8Array) {
          return new TextDecoder().decode(value);
        } else {
          return String(value);
        }
      }),
      catchError((error) => {
        console.error('Error converting HTML to Markdown:', error);
        return of(html); // Return original HTML as fallback
      })
    );
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    return of(html); // Return original HTML as fallback
  }
}