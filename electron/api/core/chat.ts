import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { v4 as uuidv4 } from "uuid";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { IpcMainInvokeEvent } from "electron/main";
import { buildReactAgent } from "../../agentic/react-agent";
import { getMcpToolsForActiveProvider } from "../../mcp";
import { chatWithAIPrompt } from "../../prompts/core/chat-with-ai";
import {
  ChatWithAIParams,
  ChatWithAISchema,
  UCParams,
} from "../../schema/core/chat-with-ai.schema";
import { buildLangchainModelProvider } from "../../services/llm/llm-langchain";
import { LLMConfigModel } from "../../services/llm/llm-types";
import { ObservabilityManager } from "../../services/observability/observability.manager";
import { store } from "../../services/store";
import { z } from "zod";
import { APP_MESSAGES } from '../../constants/message.constants';
import { GuardrailsShouldBlock, validateGuardrails } from "../../guardrails";
import { isLangfuseDetailedTracesEnabled } from '../../services/observability/observability.util';
import { getUCPrompt } from "../../prompts/core/usecase";

// Message type mapping
const MESSAGE_TYPES = {
  SystemMessage: "system",
  HumanMessage: "user",
  AIMessage: "assistant",
  ToolMessage: "tool"
} as const;

// Helper functions for message conversion
function determineLangchainMessageRole(message: any): string {
  if (message.constructor && message.constructor.name in MESSAGE_TYPES) {
    return MESSAGE_TYPES[message.constructor.name as keyof typeof MESSAGE_TYPES];
  }
  return "user";
}

function extractContent(content: any): string {
  if (Array.isArray(content)) {
    return content
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");
  }
  return content?.toString() || "";
}

export function convertToGuardrailMessage(message: any): any {
  return {
    role: determineLangchainMessageRole(message),
    content: extractContent(message.content),
    ...(message.id && { id: message.id }),
    ...(message.tool_calls && { tool_calls: message.tool_calls })
  };
}

export const chatWithAI = async (_: IpcMainInvokeEvent, data: unknown) => {
  let validatedData: ChatWithAIParams | undefined;
  
  try {
    const o11y = ObservabilityManager.getInstance();
    const trace = o11y.createTrace('chat-with-ai');

    const llmConfig = store.get<LLMConfigModel>('llmConfig');

    if (!llmConfig) {
      throw new Error('LLM configuration not found');
    }

    const model = buildLangchainModelProvider(
      llmConfig.activeProvider,
      llmConfig.providerConfigs[llmConfig.activeProvider].config
    );

    const validationSpan = trace.span({ name: 'input-validation' });
    validatedData = await ChatWithAISchema.parseAsync(data);
    validationSpan.end();

    const memoryCheckpointer = new MemorySaver();

    const mcpTools = await getMcpToolsForActiveProvider();
    const requirementTools = await buildToolsForRequirement(validatedData);

    const agent = buildReactAgent({
      model: model,
      tools: [...mcpTools, ...requirementTools],
      checkpointer: memoryCheckpointer,
    });

    const config = {
      configurable: {
        thread_id: `${validatedData.requestId}_create_solution`,
        trace: trace,
        requestId: validatedData.requestId,
        sendMessagesInTelemetry: isLangfuseDetailedTracesEnabled(),
      },
      recursionLimit: 50,
    };

    const messages = transformToLangchainMessages(validatedData.chatHistory);
    const prompt = new SystemMessage(
      validatedData.requirementAbbr === "UC"
        ? getUCPrompt(validatedData as UCParams)
        : chatWithAIPrompt(validatedData)
    );

    const allMessages = [
      prompt,
      ...messages,
    ];

    // Convert messages to guardrail format and validate
    // Get last user message for guardrails validation
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage) {
      // Only validate the last message
      const lastMessageForGuardrails = convertToGuardrailMessage(lastUserMessage);
      await validateGuardrails([lastMessageForGuardrails]);
    }

    const stream = agent.streamEvents(
      {
        messages: allMessages,
      },
      {
        version: 'v2',
        ...config,
      }
    );

    for await (const event of stream) {
      _.sender.send(`core:${validatedData.requestId}-chatStream`, event);
    }

    const finalState = await agent.getState({
      ...config,
    });

    const completionEvent = {
      event: 'specif.chat.complete',
      state: finalState,
    };

    _.sender.send(
      `core:${validatedData.requestId}-chatStream`,
      completionEvent
    );

    return finalState;
  } catch (error) {
    console.error('[chat-with-ai] error', error);
    
    const errorResponse = error instanceof GuardrailsShouldBlock 
      ? {
          response: 'Request blocked by guardrails',
          blocked: true,
          blockedReason: APP_MESSAGES.BLOCKED_REASON,
        }
      : {
          response: 'Request not processed',
          blocked: true,
          blockedReason: APP_MESSAGES.RESPONSE_NOT_PROCESSES,
        };
    _.sender.send(`core:${validatedData?.requestId}-chatStream`, {
      event: 'on_chat_model_stream',
      metadata: {
        langgraph_node: 'llm',
      },
      data: {
        chunk: errorResponse,
      },
    });
    const blockedState = {
      messages: validatedData?.chatHistory || [],
      conversationSummary: '',
      structuredResponse: {
        response: errorResponse.response,
        blocked: true,
        blockedReason: errorResponse.blockedReason      },
    };
    return blockedState;
  }
};

const buildToolsForRequirement = async (data: ChatWithAIParams) => {
  // Cache for the current document content
  let latestContent = data.requirement.description;

  // Tool to get the current requirement content
  const getCurrentRequirementContent = tool(
    () => {
      console.log("[getCurrentRequirementContent] Returning latest content");
      return latestContent;
    },
    {
      name: "get_current_requirement_content",
      description: "Get current requirement content. Always use this tool first before attempting to update the document to ensure you're working with the latest content.",
    }
  );
  
  // Define the text block replace tool schema
  const textBlockReplaceSchema = z.object({
    searchBlock: z.string().describe("The exact text block to search for in the document"),
    replaceBlock: z.string().describe("The text block to replace the search block with")
  });

  // Tool for replacing a specific text block in the document
  const replaceTextBlock = tool(
    async (input: z.infer<typeof textBlockReplaceSchema>) => {
      const { searchBlock, replaceBlock } = input;
      
      if (!searchBlock) {
        return JSON.stringify({
          success: false,
          error: "searchBlock is required"
        });
      }

      // Update the cached content
      if (latestContent && latestContent.includes(searchBlock)) {
        latestContent = latestContent.replace(searchBlock, replaceBlock);
      } else {
        return JSON.stringify({
          success: false,
          error: "Search block not found in the document"
        });
      }

      const requestId = uuidv4();
      const documentId = data.requirement.title || "current-document";

      // Create the update request
      const updateRequest = {
        requestId,
        documentId,
        updateType: "text_block_replace",
        searchBlock,
        replaceBlock
      };

      // Return the update request details
      return JSON.stringify({
        success: true,
        message: `Text block replace request created. Replacing specific text block with new content.`,
        updateRequest
      });
    },
    {
      name: "replace_text_block",
      description: `
        Purpose: Update specific sections of the document by replacing exact text blocks
        When to use: 
        - When you need to update a specific paragraph, section, or code block
        - When you want to preserve the exact formatting and structure of surrounding content
        - For precise replacements that maintain document integrity
        
        Best practices:
        - Always get the current document content first using get_current_requirement_content
        - Provide the exact text block to search for (copy it precisely from the document)
        - Ensure the replacement text fits contextually with surrounding content
        - For large documents, focus on replacing one section at a time
      `,
      schema: textBlockReplaceSchema,
    }
  );

  // Only return the two essential tools as requested
  const tools = [getCurrentRequirementContent, replaceTextBlock];

  // Add requirement-specific tools based on requirement type
  switch (data.requirementAbbr) {
    case "BP": {
      const getLinkedBRDs = tool(
        () => {
          return JSON.stringify(data.brds);
        },
        {
          name: "get_linked_brd",
          description: "Get linked BRDs",
        }
      );

      const getLinkedPRDs = tool(
        () => {
          return JSON.stringify(data.prds);
        },
        {
          name: "get_linked_prd",
          description: "Get linked PRDs",
        }
      );

      tools.push(getLinkedBRDs, getLinkedPRDs);
      break;
    }
    case "PRD": {
      const getLinkedBRDs = tool(
        () => {
          return JSON.stringify(data.brds);
        },
        {
          name: "get_linked_brd",
          description: "Get linked BRDs",
        }
      );

      tools.push(getLinkedBRDs);
      break;
    }
    case "US": {
      const getLinkedPRD = tool(
        () => {
          return data.prd;
        },
        {
          name: "get_linked_prd",
          description: "Get linked PRD",
        }
      );

      tools.push(getLinkedPRD);
      break;
    }
    case "TASK": {
      if ('userStory' in data) {
        const getLinkedUS = tool(
          () => {
            return data.userStory;
          },
          {
            name: "get_linked_us",
            description: "Get linked US",
          }
        );
        tools.push(getLinkedUS);
      }

      if ('prd' in data) {
        const getLinkedPRD = tool(
          () => {
            return data.prd;
          },
          {
            name: "get_linked_prd",
            description: "Get linked PRD",
          }
        );
        tools.push(getLinkedPRD);
      }
      break;
    }
  }

  return tools;
};

const transformToLangchainMessages = (
  chatHistory: ChatWithAIParams["chatHistory"] = []
) => {
  const langchainMessages =
    chatHistory
      .map((message) => {
        switch (message.type) {
          case "user":
            return new HumanMessage({
              id: message.id,
              content: message.content,
            });
          case "assistant":
            return new AIMessage({
              id: message.id,
              content: message.content,
              tool_calls: message.toolCalls,
            });
          case "tool":
            return new ToolMessage({
              id: message.id,
              content: message.content ?? "",
              name: message.name,
              tool_call_id: message.tool_call_id,
            });
          default:
            return null;
        }
      })
      .filter((x) => x != null) ?? [];

  return langchainMessages;
};
