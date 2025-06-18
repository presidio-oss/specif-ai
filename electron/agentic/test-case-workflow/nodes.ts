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

    const response = await agent.invoke(
      {
        messages: [
          new HumanMessage(`Please analyze this user story and gather relevant information for test case generation:
Story Title: ${state.userStoryTitle}
Story Description: ${state.userStoryDescription}
${
  state.acceptanceCriteria
    ? `Acceptance Criteria: ${state.acceptanceCriteria}`
    : ""
}
${state.technicalDetails ? `Technical Details: ${state.technicalDetails}` : ""}
${state.extraContext ? `Additional Context: ${state.extraContext}` : ""}

Consider the following aspects:
1. Core functionality that needs testing
2. User interactions and workflows
3. Technical requirements and constraints
4. Edge cases and potential failure scenarios
5. Integration points with other system components`),
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
      await workflowEvents.dispatchThinking(
        "generate-test-cases",
        {
          title: "Generating test cases based on user story and context",
        },
        runnableConfig,
        generateCorrelationId
      );

      const prompt = `Generate comprehensive test cases for the following user story following best practices from factifai.io:

Story Title: ${state.userStoryTitle}
Story Description: ${state.userStoryDescription}
${
  state.acceptanceCriteria
    ? `Acceptance Criteria: ${state.acceptanceCriteria}`
    : ""
}
${state.technicalDetails ? `Technical Details: ${state.technicalDetails}` : ""}
${state.extraContext ? `Additional Context: ${state.extraContext}` : ""}

Research Information: ${state.referenceInformation}

Follow these guidelines:
1. Each test case should be specific and focused on a single aspect
2. Include clear steps with expected results
3. Consider positive and negative test scenarios
4. Include edge cases and boundary conditions
5. Consider different user roles and permissions if applicable
6. Test error handling and validation
7. Include integration test cases where relevant
8. Consider performance and security aspects
9. Ensure test cases are traceable to requirements
10. Make test cases reusable and maintainable

Return the test cases in the following JSON format:
{
  "testCases": [
    {
      "id": "TC-1",
      "title": "Test case title",
      "description": "Detailed description of what is being tested",
      "preConditions": ["List of conditions that must be met before test execution"],
      "steps": [
        {
          "stepNumber": 1,
          "action": "Specific action to take",
          "expectedResult": "Expected outcome of the action"
        }
      ],
      "priority": "High|Medium|Low",
      "type": "Functional|Integration|UI/UX|Performance|Security",
      "status": "Draft"
    }
  ]
}`;

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

        // Instead of throwing, return state that will trigger another generation attempt
        return {
          testCases: [],
          feedbackLoops: state.feedbackLoops + 1,
          messages: [...state.messages, new HumanMessage(prompt)],
        };
      }

      console.log("[test-case-node] Successfully parsed test cases:", {
        testCasesCount: parsedTestCases.testCases?.length || 0,
      });

      await workflowEvents.dispatchAction(
        "generate-test-cases",
        {
          title: `Successfully generated ${
            parsedTestCases.testCases?.length || 0
          } test cases`,
          input: prompt,
          output: parsedTestCases.testCases || [],
        },
        runnableConfig,
        generateCorrelationId
      );

      span?.end({
        statusMessage: "Successfully generated test cases",
      });

      return {
        testCases: parsedTestCases.testCases || [],
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
          title: "Evaluating generated test cases for quality and completeness",
        },
        runnableConfig,
        evaluateCorrelationId
      );

      const prompt = `Evaluate the following test cases for quality and completeness:

Story Title: ${state.userStoryTitle}
Story Description: ${state.userStoryDescription}
${
  state.acceptanceCriteria
    ? `Acceptance Criteria: ${state.acceptanceCriteria}`
    : ""
}

Test Cases:
${JSON.stringify(state.testCases, null, 2)}

Evaluate based on these criteria:
1. Coverage of all requirements and acceptance criteria
2. Clarity and completeness of test steps
3. Appropriate test types and priorities
4. Edge cases and error scenarios coverage
5. Integration testing coverage where needed
6. Performance and security considerations
7. Adherence to best practices

If the test cases meet all criteria, respond with "APPROVED AND READY FOR REFINEMENT"
Otherwise, provide specific feedback on what needs improvement.`;

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
            ? "Test cases approved and ready for use"
            : isComplete
            ? "Completing the evaluation since the maximum evaluation limit is reached."
            : "Test cases need refinement - continuing iteration",
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
