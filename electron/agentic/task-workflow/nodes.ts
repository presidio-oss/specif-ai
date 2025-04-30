import { HumanMessage } from "@langchain/core/messages";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { createTaskPrompt } from "../../prompts/feature/task/create";
import { repairJSON } from "../../utils/custom-json-parser";
import { ITaskWorkflowStateAnnotation } from "./state";
import { TaskWorkflowRunnableConfig } from "./types";

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
        userstories: state.userStory,
        technologies: state.technicalDetails,
        extraContext: state.extraContext,
      });

      // LLM Call
      const model = modelProvider.getModel();
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
