import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ModelInfo } from "../llm-types";

export interface LangChainModelProvider {
  getModel(): BaseChatModel;
  getModelInfo(): ModelInfo;
  isValid(): boolean | Promise<boolean>;
}
