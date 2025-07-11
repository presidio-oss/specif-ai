import { ITool } from "../common/types";
import { tool } from "@langchain/core/tools";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { z } from "zod";
import fetch from "node-fetch";

/**
 * Creates a URL content fetching tool for business proposal generation
 * @returns A URL content fetching tool
 */
export const createFetchUrlTool = (): ITool => {
  return tool(
    async ({ url }: { url: string }) => {
      try {
        console.log(`[fetch_url_content] Received request to fetch content from URL: ${url}`);
        
        // Basic URL validation
        if (!url || typeof url !== 'string') {
          console.error(`[fetch_url_content] Invalid URL provided: ${url}`);
          return "Error: URL must be a non-empty string";
        }
        
        // Check if URL has a valid format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          const originalUrl = url;
          url = 'https://' + url;
          console.log(`[fetch_url_content] Added https:// prefix to URL: ${originalUrl} -> ${url}`);
        }
        
        // First try a simple fetch to check if the URL is accessible
        console.log(`[fetch_url_content] Testing URL accessibility: ${url}`);
        try {
          const response = await fetch(url, { 
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (!response.ok) {
            console.error(`[fetch_url_content] URL returned status ${response.status}: ${url}`);
            return `Error: URL returned status ${response.status}. Please check if the URL is correct and accessible.`;
          }
          
          console.log(`[fetch_url_content] URL is accessible: ${url}`);
        } catch (fetchError) {
          console.error(`[fetch_url_content] Error accessing URL: ${url}`, fetchError);
          return `Error accessing URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}. Please check if the URL is correct and accessible.`;
        }
        
        // If the URL is accessible, use CheerioWebBaseLoader to extract content
        console.log(`[fetch_url_content] Loading content from URL: ${url}`);
        const loader = new CheerioWebBaseLoader(url, {
          selector: "body"
        });
        
        const docs = await loader.load();
        
        if (!docs || docs.length === 0 || !docs[0].pageContent) {
          console.error(`[fetch_url_content] No content found at URL: ${url}`);
          return `No content found at URL: ${url}. The page might be empty or require JavaScript to load content.`;
        }
        
        const content = docs[0].pageContent.slice(0, 2000); // truncate if needed
        
        // Log the content that was fetched
        console.log(`[fetch_url_content] Successfully fetched content from URL: ${url}`);
        console.log(`[fetch_url_content] Content preview (first 200 chars): ${content.substring(0, 200)}...`);
        console.log(`[fetch_url_content] Content length: ${content.length} characters`);
        
        return content;
      } catch (error) {
        console.error(`[fetch_url_content] Error fetching URL content:`, error);
        return `Error fetching content from URL: ${error instanceof Error ? error.message : String(error)}. Please try a different URL or check your internet connection.`;
      }
    },
    {
      name: "fetch_url_content",
      description: "Fetch readable content from a given URL for proposal generation. The URL should be a complete web address (e.g., 'https://example.com').",
      schema: z.object({ 
        url: z.string().describe("The complete URL to fetch content from (e.g., 'https://example.com')") 
      }),
    }
  );
};

/**
 * Creates all tools for the use case workflow
 * @returns An array of tools for the use case workflow
 */
export const createUseCaseWorkflowTools = (): ITool[] => {
  return [
    createFetchUrlTool(),
  ];
};
