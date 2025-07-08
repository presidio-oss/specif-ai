import * as path from "path";
import { ContextItem } from "../schema/core/usecase.schema";
import { extractTextFromURL } from "./scrape";
import { extractTextFromDocx } from "./file";

export const processContextItems = async (
  items: ContextItem[]
): Promise<ContextItem[]> => {
  const updated: ContextItem[] = [];

  for (const item of items) {
    let summary = "";
    try {
      if (item.type === "url") {
        summary = await extractTextFromURL(item.source);
      } else if (item.type === "docx") {
        const localPath = path.resolve(item.source);
        summary = await extractTextFromDocx(localPath);
      }
    } catch (err) {
      console.warn("Failed to process context item:", item, err);
    }

    updated.push({ ...item, summary });
  }

  return updated;
};
