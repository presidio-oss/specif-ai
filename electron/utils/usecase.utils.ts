import { ContextItem } from "../schema/core/usecase.schema";

// Simplified version that doesn't process URLs or documents
export const processContextItems = async (
  items: ContextItem[]
): Promise<ContextItem[]> => {
  return items;
};
