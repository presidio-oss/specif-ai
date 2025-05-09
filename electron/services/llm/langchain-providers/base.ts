import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ModelInfoV1 } from "../llm-types";

export interface LangChainModelProvider {
  getChatModel(): BaseChatModel;
  getModel(): {
    id: string;
    provider: string;
    info: ModelInfoV1;
  };
  isValid(): boolean | Promise<boolean>;
}
