# Agent-Driven Requirement Authoring 🤖

Specifai leverages advanced AI to automate the creation of various content types. This guide covers how Specifai can generate user stories, tasks, test cases, and strategic initiatives automatically.

## 📝 Automating User Story & Task Creation

This feature enables the seamless generation of user stories and associated tasks from a selected Product Requirement Document (PRD). It leverages an intelligent **Agentic Flow** that interprets the provided context to produce meaningful and actionable development items.

<div align="center">

![User Story Generation](../../static/gif/specifai-user-stories.gif)
*Agent-driven user story generation in action*

</div>

### 🔹 How It Works

1.  **Select a PRD:**
    Begin by selecting the relevant PRD from the available list.

2.  **Click on 'Generate Stories':**
    Once the PRD is selected, click the **Generate Stories** button.

3.  **Provide Context in the Popup:**
    A popup window will appear, prompting you to gather additional context or clarification to guide the generation process.

4.  **User Story & Task Generation:**
    Upon submission, the backend **Agentic Flow** is triggered. It performs two key actions:
    * It generates **User Stories** based on the selected PRD and the provided context.
    * If MCP servers are configured (like AWS Bedrock Knowledge Base), the Agentic flow uses them to enhance context and improve the quality of generated stories.
    * It automatically invokes the **Generate Tasks** workflow for each generated story, creating well-defined tasks under each story.

### 🔄 Regeneration Support

You can regenerate user stories and tasks at any time. When this action is triggered:

<div align="center">

![User Story Regeneration Interface](../../static/img/specifai-regenerate-stories.png)
*Story regeneration interface with archival support*

</div>

* All previously generated user stories and tasks are **automatically archived**.
* A **new set of user stories and tasks** is created based on the latest context and PRD selection.

This ensures the system always reflects the most current understanding of requirements while maintaining historical traceability.

---

## 🧪 Automating Test Case Generation

This feature allows you to automatically generate comprehensive test cases from user stories, ensuring complete coverage of requirements and facilitating robust quality assurance processes. The system leverages an intelligent **3-Phase Agentic Flow** to interpret user stories and its parent product requirement, producing detailed test cases that thoroughly validate functionality.

<div align="center">

![Test Case Generation](../../static/gif/specifai-testcase-generation.gif)
*Agent-driven test case generation in action*

</div>

### 🔹 How It Works

1.  **Navigate to User Stories:**
    Begin by selecting the relevant PRD from the available list, then click the **"Stories"** button to view its associated user stories.

2. **Select a User Story:**
    Begin by selecting the user story for which you want to generate test cases.

3.  **Click on 'Test Cases' button:**
    Click the **Test Cases** button associated with the selected user story. This will open the test case list screen.

4.  **Click on 'Generate Test Cases':**
    Once the test case list screen is open, click the **Generate Test Cases** button.

5.  **Provide User Screens Involved and Extra Context in the Popup:**
    A popup window will appear, prompting you to provide additional context, such as:
    * **UI Screens**: Specify which screens/pages are involved in the user story flow
    * **Extra Context**: Any extra information that can help the AI generate more accurate test cases.

6.  **Test Case Generation:**
    Upon submission, the backend **3-Phase Agentic Flow** is triggered. It performs the following actions:
    * Generates comprehensive test cases based on user story and context.
    * Enhances quality using MCP servers (AWS Bedrock KB) when configured
    * Links test cases to user story for full traceability
    * Creates structured format with prerequisites, steps, expected results, and alternative flows

### 🔄 Regeneration Support

You can regenerate test cases at any time. When triggered:
* Previously generated test cases are **automatically archived** for historical reference
* New test cases are created based on the latest user story updates and context.
* Full traceability is maintained throughout the regeneration process.

### 🎯 Key Benefits

* **Complete Coverage**: Functional, integration, edge cases, and negative scenarios.
* **Structured Format**: Clear prerequisites, steps, expected results, and alternative flows.
* **Traceability**: Direct linkage to source user stories and acceptance criteria.
* **Quality Validation**: AI-evaluated for completeness and testing best practices.

---

## 🎯 Automating Strategic Initiative Generation

This feature enables you to create high-level strategic initiatives that align business goals with technical execution. Strategic initiatives provide a framework for organizing and prioritizing your solutions across the enterprise portfolio. The system leverages an intelligent **Two-Phase Agentic Workflow** to generate comprehensive strategic initiatives with enhanced context from external research.

<div align="center">

![Strategic Initiative Generation](../../static/gif/specifai-si.gif)
*Agent-driven strategic initiative generation in action*

</div>

### 🔹 How It Works

1. **Access Strategic Initiatives:**
   Navigate to the Strategic Initiatives section of your solution.

2. **Click on 'Generate Strategic Initiative':**
   Click the **Generate Strategic Initiative** button to start the creation process.

3. **Provide Context in the Popup:**
   A popup window will appear, prompting you to provide:
   * **Title**: A descriptive name for your strategic initiative
   * **Description**: High-level overview of the initiative's goals
   * **Research URLs**: Links to external resources that provide additional context (market research, industry reports, technical documentation)

4. **Strategic Initiative Generation:**
   Upon submission, the backend **Two-Phase Agentic Workflow** is triggered:
   * **Research Phase**: The system processes all available context, including your solution details and any provided research URLs
   * **Generation Phase**: Creates a comprehensive strategic initiative with vision statement, business drivers, success criteria, and timeline
   * If MCP servers are configured (like AWS Bedrock Knowledge Base), they're leveraged to enhance the quality and relevance of the generated initiative

### 🔄 URL-Enhanced Context

One of the most powerful features of Strategic Initiative generation is the ability to incorporate external research:

* **How to Add Research URLs:**
  * Include URLs to relevant market research, industry reports, competitor analysis, or technical documentation
  * The system will process these resources and incorporate key insights into your strategic initiative
  * Multiple URLs can be added for comprehensive context

* **Benefits of URL Integration:**
  * More informed strategic planning
  * Data-driven decision making
  * Industry alignment
  * Enhanced initiative quality and relevance

### 🌟 Key Benefits

* **Business Alignment**: Ensures technical efforts directly support strategic business goals
* **Enhanced Context**: External research URLs provide deeper insights
* **Comprehensive Structure**: Generated initiatives include vision, drivers, success criteria, and timelines
* **Enterprise Portfolio View**: Organize and prioritize solutions to maximize strategic impact

---

## Integration with Other Features

Agent-Driven Requirement Authoring works seamlessly with other Specifai features:

- Use the [Intelligent Chat Interface](ai-interaction.md) to refine and enhance generated content
- Apply [Intelligent Inline Editing](ai-interaction.md) to improve specific sections of generated content
- [Export and integrate](export-integration.md) your generated content to external systems

For detailed information on the different types of requirements that can be generated, see [Requirements Document Types](requirement-types.md).
