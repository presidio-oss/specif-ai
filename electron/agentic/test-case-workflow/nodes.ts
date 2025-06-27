import { HumanMessage } from "@langchain/core/messages";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { WorkflowEventsService } from "../../services/events/workflow-events.service";
import { LangChainModelProvider } from "../../services/llm/langchain-providers/base";
import { ITool } from "../common/types";
import { buildReactAgent } from "../react-agent";
import { repairJSON } from "../../utils/custom-json-parser";
import { ITestCaseWorkflowStateAnnotation } from "./state";
import { TestCaseWorkflowRunnableConfig } from "./types";
import { 
  buildResearchPrompt, 
  buildGenerateTestCasesPrompt, 
  buildEvaluateTestCasesPrompt 
} from "./prompts";

const workflowEvents = new WorkflowEventsService("test-case");

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
    state: ITestCaseWorkflowStateAnnotation["State"],
    runnableConfig: TestCaseWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig?.configurable ?? {};
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
        title: "Researching context for test case generation",
        input: JSON.stringify({
          userStoryTitle: state.userStoryTitle,
          availableTools: tools.length,
          researchGoals: [
            "Gather technical implementation details",
            "Identify system dependencies and integration points",
            "Understand user workflows and interactions",
            "Discover potential edge cases and error scenarios"
          ]
        })
      },
      runnableConfig,
      researchCorrelationId
    );

    const agent = buildReactAgent({
      model: model,
      tools: tools,
      responseFormat: {
        prompt: `Based on the user story and any available technical details, summarize the key points that will be important for test case generation. Consider:
1. Core functionality being tested
2. User interactions and workflows
3. Technical requirements and constraints
4. Edge cases and potential failure scenarios
5. Integration points with other system components`,
        schema: z.object({
          referenceInformation: z.string(),
        }),
      },
      checkpointer: checkpointer,
    });

    const recursionLimit = Math.min(
      Math.max(64, tools.length * 2 * 3 + 1),
      128
    );

    const prompt = buildResearchPrompt(
      state.userStoryTitle,
      state.userStoryDescription,
      state.acceptanceCriteria,
      state.technicalDetails,
      state.userScreensInvolved,
      state.extraContext,
      state.prdId,
      state.prdTitle,
      state.prdDescription
    );

    const response = await agent.invoke(
      {
        messages: [new HumanMessage(prompt)],
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
        title: "Research completed - context gathered for test case generation",
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

export const buildGenerateTestCasesNode = (
  modelProvider: LangChainModelProvider
) => {
  return async (
    state: ITestCaseWorkflowStateAnnotation["State"],
    runnableConfig: TestCaseWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig?.configurable ?? {};

    const span = trace?.span({
      name: "generate-test-cases",
    });

    const generateCorrelationId = uuid();

    try {
      const isRefinement = state.feedbackLoops > 0 && state.testCases.length > 0;
      
      await workflowEvents.dispatchThinking(
        "generate-test-cases",
        {
          title: isRefinement 
            ? `Refining test cases for user story: ${state.userStoryTitle}` 
            : `Generating test cases for user story: ${state.userStoryTitle}`,
          input: JSON.stringify({
            userStoryTitle: state.userStoryTitle,
            iteration: state.feedbackLoops + 1,
            isRefinement: isRefinement,
            existingTestCasesCount: state.testCases.length,
            hasReferenceInfo: !!state.referenceInformation,
            hasAcceptanceCriteria: !!state.acceptanceCriteria,
            hasExtraContext: !!state.extraContext,
            hasPRDInfo: !!(state.prdId && state.prdTitle),
            testCaseGenerationGoals: [
              "Create comprehensive test coverage",
              "Include positive and negative test scenarios",
              "Prioritize tests based on business impact",
              "Ensure clear test steps and expected results"
            ]
          })
        },
        runnableConfig,
        generateCorrelationId
      );

      const prompt = buildGenerateTestCasesPrompt(
        state.userStoryTitle,
        state.userStoryDescription,
        state.acceptanceCriteria,
        state.technicalDetails,
        state.userScreensInvolved,
        state.extraContext,
        state.referenceInformation,
        state.prdId,
        state.prdTitle,
        state.prdDescription,
        isRefinement ? state.testCases : undefined,
        isRefinement ? state.evaluation : undefined
      );

      const generation = span?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        environment: process.env.APP_ENVIRONMENT,
        input: sendMessagesInTelemetry
          ? state.messages.length > 0
            ? state.messages
            : [new HumanMessage(prompt)]
          : undefined,
      });

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

      let parsedTestCases;
      try {
        const responseText =
          typeof response === "string" ? response : response.content.toString();
        console.log("[test-case-node] Raw LLM response:", responseText);

        let cleanedResponse = repairJSON(responseText);
        console.log("[test-case-node] Cleaned response:", cleanedResponse);

        parsedTestCases = JSON.parse(cleanedResponse);
      } catch (error) {
        console.error("Error parsing LLM response:", error);
        span?.end({
          level: "ERROR",
          statusMessage: `Error parsing LLM response: ${error}`,
        });

        return {
          testCases: [],
          feedbackLoops: state.feedbackLoops + 1,
          messages: [...state.messages, new HumanMessage(prompt)],
        };
      }

      if (!parsedTestCases.testCases || !Array.isArray(parsedTestCases.testCases) || parsedTestCases.testCases.length === 0) {
        const errorMessage = "Invalid response format: No test cases found in the parsed response";
        console.error(errorMessage, parsedTestCases);
        
        span?.end({
          level: "ERROR",
          statusMessage: errorMessage,
        });
        
        await workflowEvents.dispatchAction(
          "generate-test-cases",
          {
            title: "Error: No test cases found in the response",
            input: prompt,
          },
          runnableConfig,
          generateCorrelationId
        );
        
        if (state.feedbackLoops >= 2) {
          throw new Error("Failed to generate valid test cases after multiple attempts");
        }
        
        return {
          testCases: [],
          feedbackLoops: state.feedbackLoops + 1,
          messages: [...state.messages, new HumanMessage(prompt)],
        };
      }
      
      const testCaseCount = parsedTestCases.testCases.length;
      console.log("[test-case-node] Successfully parsed test cases:", {
        testCaseCount,
      });

      await workflowEvents.dispatchAction(
        "generate-test-cases",
        {
          title: isRefinement
            ? `Successfully refined ${testCaseCount} test cases. (Iteration ${state.feedbackLoops + 1})`
            : `Successfully generated ${testCaseCount} test cases.`,
          input: prompt,
          output: parsedTestCases.testCases,
        },
        runnableConfig,
        generateCorrelationId
      );

      span?.end({
        statusMessage: isRefinement 
          ? `Successfully refined ${testCaseCount} test cases` 
          : `Successfully generated ${testCaseCount} test cases`,
      });

      return {
        testCases: parsedTestCases.testCases,
        feedbackLoops: state.feedbackLoops + 1,
        messages: [...state.messages, new HumanMessage(prompt)],
      };
    } catch (error) {
      const message = `[test-case-workflow] Error in generate-test-cases node: ${error}`;
      span?.end({
        level: "ERROR",
        statusMessage: message,
      });

      await workflowEvents.dispatchAction(
        "generate-test-cases",
        { title: "Error occurred during test case generation" },
        runnableConfig,
        generateCorrelationId
      );

      // If we reach max retries, complete with empty test cases
      if (state.feedbackLoops >= 3) {
        return {
          testCases: [],
          feedbackLoops: state.feedbackLoops + 1,
          isComplete: true,
          messages: state.messages,
        };
      }

      // Otherwise, return state that will trigger another generation attempt
      return {
        testCases: [],
        feedbackLoops: state.feedbackLoops + 1,
        messages: state.messages,
        isComplete: false,
      };
    }
  };
};

export const buildEvaluateTestCasesNode = (
  modelProvider: LangChainModelProvider
) => {
  return async (
    state: ITestCaseWorkflowStateAnnotation["State"],
    runnableConfig: TestCaseWorkflowRunnableConfig
  ) => {
    const { trace, sendMessagesInTelemetry = false } =
      runnableConfig.configurable ?? {};
    const span = trace?.span({
      name: "evaluate-test-cases",
    });

    const evaluateCorrelationId = uuid();

    try {
      if (state.testCases.length === 0) {
        const message = "No test cases to evaluate";
        span?.end({
          statusMessage: message,
        });

        await workflowEvents.dispatchAction(
          "evaluate-test-cases",
          {
            title: "No test cases available for evaluation",
          },
          runnableConfig,
          evaluateCorrelationId
        );

        return {
          evaluation: message,
          isComplete: true,
        };
      }

      await workflowEvents.dispatchThinking(
        "evaluate-test-cases",
        {
          title: `Evaluating ${state.testCases.length} test cases for user story: ${state.userStoryTitle} (Iteration ${state.feedbackLoops})`,
          input: JSON.stringify({
            testCaseCount: state.testCases.length,
            userStoryTitle: state.userStoryTitle,
            iteration: state.feedbackLoops,
            evaluationCriteria: [
              "Coverage of acceptance criteria",
              "Edge case handling",
              "Test case clarity and structure",
              "Appropriate test priorities",
              "Completeness of test steps"
            ]
          }),
        },
        runnableConfig,
        evaluateCorrelationId
      );

      const prompt = buildEvaluateTestCasesPrompt(
        state.userStoryTitle,
        state.userStoryDescription,
        state.acceptanceCriteria,
        state.userScreensInvolved,
        state.testCases,
        state.prdId,
        state.prdTitle,
        state.prdDescription
      );

      const generation = span?.generation({
        name: "llm",
        model: modelProvider.getModel().id,
        input: sendMessagesInTelemetry
          ? state.messages.length > 0
            ? state.messages
            : [new HumanMessage(prompt)]
          : undefined,
      });

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

      const responseText =
        typeof response === "string" ? response : response.content.toString();
      const isApproved = responseText.includes(
        "APPROVED AND READY FOR REFINEMENT"
      );

      const isComplete = isApproved || state.feedbackLoops >= 3;

      await workflowEvents.dispatchAction(
        "evaluate-test-cases",
        {
          title: isApproved
            ? `${state.testCases.length} test cases approved for user story: ${state.userStoryTitle}`
            : isComplete
            ? `Completing evaluation after ${state.feedbackLoops} iterations for user story: ${state.userStoryTitle}`
            : `Test cases need refinement for user story: ${state.userStoryTitle} (Iteration ${state.feedbackLoops} of 3)`,
          output: isApproved 
            ? "All test cases meet quality standards and cover the user story requirements adequately."
            : isComplete
            ? "Maximum iteration limit reached. Using current test cases as final version."
            : `Iteration ${state.feedbackLoops} of 3: Test cases need improvement in one or more areas. Continuing refinement process to enhance quality and coverage.`,
        },
        runnableConfig,
        evaluateCorrelationId
      );

      span?.end({
        statusMessage: isApproved
          ? "Test cases approved"
          : "Test cases need refinement",
      });

      return {
        evaluation: response,
        isComplete: isComplete,
        messages: [...state.messages, new HumanMessage(prompt)],
      };
    } catch (error) {
      const message = `Error in evaluate-test-cases node: ${error}`;
      console.error(message, error);
      span?.end({
        level: "ERROR",
        statusMessage: message,
      });

      await workflowEvents.dispatchAction(
        "evaluate-test-cases",
        {
          title: "Error occurred during test case evaluation",
        },
        runnableConfig,
        evaluateCorrelationId
      );

      return {
        isComplete: true,
      };
    }
  };
};

export const shouldContinueEdge = (
  state: ITestCaseWorkflowStateAnnotation["State"]
) => {
  if (state.isComplete) {
    return "complete";
  }
  return "needs_refinement";
};
