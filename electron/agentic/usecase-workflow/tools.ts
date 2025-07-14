import { ITool } from "../common/types";
import { tool } from "@langchain/core/tools";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { z } from "zod";
import fetch from "node-fetch";

export const createFetchUrlTool = (): ITool => {
  return tool(
    async ({ url }: { url: string }) => {
      try {
        if (!url || typeof url !== 'string') {
          return "Error: URL must be a non-empty string";
        }
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        try {
          const response = await fetch(url, { 
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (!response.ok) {
            return `Error: URL returned status ${response.status}. Please check if the URL is correct and accessible.`;
          }
        } catch (fetchError) {
          return `Error accessing URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}. Please check if the URL is correct and accessible.`;
        }
        
        const loader = new CheerioWebBaseLoader(url, {
          selector: "body"
        });
        
        const docs = await loader.load();
        
        if (!docs || docs.length === 0 || !docs[0].pageContent) {
          return `No content found at URL: ${url}. The page might be empty or require JavaScript to load content.`;
        }
        
        const content = docs[0].pageContent.trim().slice(0, 2000);
        console.log("Content fetched from URL:", content);
        return content;
      } catch (error) {
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

export const createUseCaseWorkflowTools = (): ITool[] => {
  return [
    createFetchUrlTool(),
  ];
};
