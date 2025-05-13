import { HumanMessage } from "@langchain/core/messages";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildReactAgent } from "../react-agent";
import { createTaskPrompt } from "../../prompts/feature/task/create";
import { repairJSON } from "../../utils/custom-json-parser";
import { ITaskWorkflowStateAnnotation } from "./state";
import { TaskWorkflowRunnableConfig } from "./types";
import { createTaskResearchInformationPrompt } from "./prompts/research-information";
import { createSummarizeTaskResearchPrompt } from "./prompts/summarize-research";

type BuildResearchNodeParams = {
  model: LangChainModelProvider;
  tools: Array<ITool>;
  checkpointer?: BaseCheckpointSaver | false | undefined;
};

export const buildResearchNode = ({
  model,
  tools,
  checkpointer,
}: BuildResearchNodeParams) => {
  return async (
    state: ITaskWorkflowStateAnnotation["State"],
    runnableConfig: TaskWorkflowRunnableConfig
  ) => {
    const trace = runnableConfig.configurable?.trace;
    const span = trace?.span({
      name: "research",
    });

    if (tools.length === 0) {
      const message = "No tools are passed so skipping research phase";
      span?.end({
        statusMessage: message,
      });

      return {
        referenceInformation: "",
      };
    }

    const agent = buildReactAgent({
      model: model,
      tools: tools,
      responseFormat: {
        prompt: createSummarizeTaskResearchPrompt({
          appName: state.appName,
          appDescription: state.appDescription,
          name: state.name,
          description: state.description,
          technicalDetails: state.technicalDetails,
          extraContext: state.extraContext,
        }),
        schema: z.object({
          referenceInformation: z.string(),
        }),
      },
      checkpointer: checkpointer,
    });

    // max(min(64, each tool called twice (for each tool call - llm node + tool node + trim messages node) so 3) + 1 (for structured output)), 128)
    const recursionLimit = Math.min(
      Math.max(64, tools.length * 2 * 3 + 1),
      128
    );

    const response = await agent.invoke(
      {
        messages: [
          createTaskResearchInformationPrompt({
            appName: state.appName,
            appDescription: state.appDescription,
            name: state.name,
            description: state.description,
            technicalDetails: state.technicalDetails,
            extraContext: state.extraContext,
            recursionLimit: recursionLimit,
          }),
        ],
      },
      {
        recursionLimit: recursionLimit,
        configurable: {
          trace: span,
          thread_id: runnableConfig.configurable?.thread_id,
        },
      }
    );

    span?.end({
      statusMessage: "Research completed successfully!",
    });

    return {
      referenceInformation: response.structuredResponse.referenceInformation,
    };
  };
};

// Generate Tasks Node
export const buildGenerateTasksNode = (
  modelProvider: LangChainModelProvider
) => {
  return async (
    state: ITaskWorkflowStateAnnotation["State"],
    runnableConfig: TaskWorkflowRunnableConfig
  ) => {
    const trace = runnableConfig.configurable?.trace;
    const span = trace?.span({
      name: "generate-tasks",
    });

    try {
      // Use existing createTaskPrompt
      const prompt = createTaskPrompt({
        name: state.name,
        description: state.description,
        technologies: state.technicalDetails,
        extraContext: state.extraContext,
        referenceInformation: state.referenceInformation,
      });

      // LLM Call
      const model = modelProvider.getChatModel();
      const response = await model.invoke(prompt);

      let parsedTasks;
      try {
        // Use existing JSON repair utility
        const responseText =
          typeof response === "string" ? response : response.content.toString();
        let cleanedResponse = repairJSON(responseText);
        parsedTasks = JSON.parse(cleanedResponse);
      } catch (error) {
        console.error("Error parsing LLM response:", error);
        span?.end({
          level: "ERROR",
          statusMessage: `Error parsing LLM response: ${error}`,
        });
        throw new Error("Invalid response format from LLM");
      }

      span?.end({
        statusMessage: "Successfully generated tasks",
      });

      return {
        tasks: parsedTasks.tasks || [],
        feedbackLoops: state.feedbackLoops + 1,
        isComplete: true, // Complete after one generation
        messages: [...state.messages, new HumanMessage(prompt)],
      };
    } catch (error) {
      const message = `[task-workflow] Error in generate-tasks node: ${error}`;
      console.error(message, error);
      span?.end({
        level: "ERROR",
        statusMessage: message,
      });

      // Return current state to avoid breaking the workflow
      return {
        feedbackLoops: state.feedbackLoops + 1,
        isComplete: true, // Force completion on error
      };
    }
  };
};
