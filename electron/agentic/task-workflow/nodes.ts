import { HumanMessage } from "@langchain/core/messages";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { WorkflowEventsService } from "../../services/events/workflow-events.service";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildReactAgent } from "../react-agent";
import { createTaskPrompt } from "../../prompts/feature/task/create";
import { repairJSON } from "../../utils/custom-json-parser";
import { ITaskWorkflowStateAnnotation } from "./state";
import { TaskWorkflowRunnableConfig } from "./types";
import { createTaskResearchInformationPrompt } from "./prompts/research-information";
import { createSummarizeTaskResearchPrompt } from "./prompts/summarize-research";

const workflowEvents = new WorkflowEventsService("task");

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
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig.configurable ?? {};
    const span = trace?.span({
      name: "research",
    });

    const researchCorrelationId = uuid();

    if (tools.length === 0) {
      const message = "No tools are passed so skipping research phase";
      span?.end({
        statusMessage: message,
      });

      await workflowEvents.dispatchAction(
        "research",
        {
          title: "Skipped research phase - no tools were available",
        },
        runnableConfig
      );

      return {
        referenceInformation: "",
      };
    }

    await workflowEvents.dispatchThinking(
      "research",
      {
        title: "Researching relevant context for task generation",
      },
      runnableConfig,
      researchCorrelationId
    );

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
          sendMessagesInTelemetry: sendMessagesInTelemetry,
        },
      }
    );

    await workflowEvents.dispatchAction(
      "research",
      {
        title: "Research completed - context gathered for task generation",
        output: response.structuredResponse.referenceInformation,
      },
      runnableConfig,
      researchCorrelationId
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
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig.configurable ?? {};
    const span = trace?.span({
      name: "generate-tasks",
    });

    const generateCorrelationId = uuid();

    try {
      await workflowEvents.dispatchThinking(
        "generate-tasks",
        {
          title: "Generating detailed tasks based on requirements and context",
        },
        runnableConfig,
        generateCorrelationId
      );

      // Use existing createTaskPrompt
      const prompt = createTaskPrompt({
        name: state.name,
        description: state.description,
        technologies: state.technicalDetails,
        extraContext: state.extraContext,
        referenceInformation: state.referenceInformation,
      });

      const generation = span?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        environment: process.env.APP_ENVIRONMENT,
        input: sendMessagesInTelemetry ? prompt : undefined,
      });

      // LLM Call
      const model = modelProvider.getChatModel();
      const response = await model.invoke(prompt);

      generation?.end({
        usage: {
          input: response.usage_metadata?.input_tokens,
          output: response.usage_metadata?.output_tokens,
          total: response.usage_metadata?.total_tokens,
        },
        output: sendMessagesInTelemetry ? response : undefined,
      });

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

      await workflowEvents.dispatchAction(
        "generate-tasks",
        {
          title: `Successfully generated ${
            parsedTasks.tasks?.length || 0
          } tasks`,
          input: prompt,
          output: parsedTasks,
        },
        runnableConfig,
        generateCorrelationId
      );

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

      await workflowEvents.dispatchAction(
        "generate-tasks",
        {
          title: "Error occurred during task generation",
        },
        runnableConfig,
        generateCorrelationId
      );

      // Return current state to avoid breaking the workflow
      return {
        feedbackLoops: state.feedbackLoops + 1,
        isComplete: true, // Force completion on error
      };
    }
  };
};
