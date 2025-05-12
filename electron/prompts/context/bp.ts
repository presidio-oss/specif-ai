export const BP_DEFINITION_CONTEXT = `A business process flow document outlines the sequential steps, interactions, and decision points needed to achieve specific business objectives. It provides a clear roadmap for implementing operational workflows and organizational procedures.
Key Components:
- The Business Process Flow must identify all stakeholders and their roles in the process
- Include clear sequential steps showing how tasks flow from initiation to completion
- Define decision points and their associated outcomes
- Specify inputs required and outputs generated at each stage
- Document roles and responsibilities for each process phase
- Address cross-functional interactions and handoffs between teams

Process Elements:
1. Stakeholder Mapping:
  - Identify all parties involved in the process
  - Define their interests and impact
  - Establish communication channels

2. Process Phases:
  - Break down the workflow into logical phases
  - Set entry and exit criteria for each phase
  - Define phase dependencies

3. Action Sequences:
  - Detail step-by-step activities
  - Establish workflow triggers
  - Define completion criteria

4. Decision Framework:
  - Identify key decision points
  - Document decision criteria
  - Outline alternative paths`;

export const BP_CONTEXT = `${BP_DEFINITION_CONTEXT}

STRICT:
- (!) The examples below are for formatting purposes only and should not be replicated verbatim in actual documents.
- Customer onboarding process includes identity verification, account setup, and welcome package distribution with defined SLAs for each step.
- Change management process requires documentation, impact analysis, stakeholder approval, and implementation planning before execution.

Instructions:
- Create a comprehensive process flow that captures all necessary steps and interactions
- Ensure clear definition of roles, responsibilities, and handoffs
- Include decision points and their impact on process flow
- Define measurable outcomes and success criteria
- Maintain focus on business objectives and value delivery`
