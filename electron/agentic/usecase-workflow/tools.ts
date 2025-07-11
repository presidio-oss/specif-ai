import { ITool } from "../common/types";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import fetch from "node-fetch";

/**
 * Creates a simple web search tool that doesn't rely on duck-duck-scrape
 * @returns A web search tool
 */
export const createWebSearchTool = (): ITool => {
  return new DynamicStructuredTool({
    name: "web_search",
    description: "Search the web for information on a given topic",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z.number().optional().describe("The maximum number of results to return (default: 5)")
    }),
    func: async (args: { query: string, maxResults?: number }) => {
      try {
        if (args.query.trim() === "") {
          throw new Error("Search query is empty. It must be a valid string.");
        }
        
        // Use a simple search API that doesn't require additional dependencies
        const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json`);
        const data = await response.json() as any;
        
        // Format the results in a readable way
        let results = `Search results for "${args.query}":\n\n`;
        
        // Add abstract if available
        if (data && data.AbstractText) {
          results += `Summary: ${data.AbstractText}\n`;
          if (data.AbstractURL) {
            results += `Source: ${data.AbstractURL}\n`;
          }
          results += "\n";
        }
        
        // Add related topics
        if (data && data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
          const maxResults = args.maxResults || 5;
          const topics = data.RelatedTopics.slice(0, maxResults);
          
          if (topics.length > 0) {
            results += "Related information:\n";
            topics.forEach((topic: any, index: number) => {
              if (topic && topic.Text) {
                results += `${index + 1}. ${topic.Text}\n`;
                if (topic.FirstURL) {
                  results += `   URL: ${topic.FirstURL}\n`;
                }
                results += "\n";
              }
            });
          }
        }
        
        // If no results found
        if (results === `Search results for "${args.query}":\n\n`) {
          results += "No specific information found. Try refining your search query.";
        }
        
        return results;
      } catch (error) {
        console.error("Error in web search:", error);
        return `Error performing web search: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
};

/**
 * Creates all tools for the use case workflow
 * @returns An array of tools for the use case workflow
 */
export const createUseCaseWorkflowTools = (): ITool[] => {
  return [
    createWebSearchTool(),
  ];
};
