# Changelog

## [2.8.1]

### Enhancements

- Added ESLint configuration for UI components to improve code quality and consistency.
- Enhanced PMO integration modal with optimized page size (reduced from 200 to 100 items) for better performance.
- Improved badge functionality with click support for opening Jira/ADO links directly from requirement badges.
- Added informational tooltips and "New" pill indicators for better user guidance on new modules.
- Updated documentation structure with improved Docusaurus home page UI and core features section.

### Fixed

- Resolved pagination logic issues in PMO integration modal to correctly determine item availability.
- Addressed ID duplication and pagination issues in PMO integrations for more reliable data handling.
- Fixed chat streaming object serialization issues and added support for new Claude models.

## [2.8.0]

### Added

- Introduced a Strategic Initiative Builder to enable creation and management of business proposals.
- Added Inline Editor functionality for all requirements to support quick, selection-context editing.

### Enhancements
- Refactored to securely persist JIRA/ADO credentials in Electron Store instead of metadata.
- Enhanced HAI Chat to fully replace requirement text with structured AI suggestions, enabling clearer edits and reducing hallucinations during refinement.
- Updated Jira integration to follow a modal-based workflow similar to ADO, with precise ticket-level Pull/Push controls for a consistent user experience.

### Fixed

- Fixed an issue where user stories could not be regenerated after deleting a story within the same PRD.
- Updated toast notifications to display appropriate messages when copying user stories and other requirements.

## [2.7.0]

### Added

- Bi-directional JIRA synchronisation with custom ADF conversion utilities for consistent cross-platform formatting.
- Azure DevOps (ADO) Pull and Push integration for seamless synchronisation.
- Automated JIRA ID migration system converting legacy fields (epicTicketId, userStoryId, subTaskTicketId) to a unified pmoId structure.
- Agentic test case generation feature for creating comprehensive test case scenarios from requirements.
- Docusaurus documentation platform for streamlined onboarding and comprehensive usage reference.
- Solution creation workflow now redirects to the solution view with real-time progress updates. Added abort and retry controls for enhanced user control.

### Enhancement

- Requirement description rich text editor now supports table and link management (create, edit, delete operations).
- AI prompt logic now preserves tables and links during content updates, maintaining formatting integrity.
- Bidirectional PRD–User Story navigation for improved workflow transitions and traceability.
- Export dropdown grouping for improved user experience.
- Standardised chat header displays "Talk to HAI" for updated branding consistency.
- Added "Reset Settings" button on the settings page to reset LLM and other configurations.

### Fixed

- Consistent card heights across all pages for a cohesive user experience.
- Extracted sidebar into a separate component for improved code maintainability.
- Updated JIRA callback port to 12345 to resolve conflicts with other system processes.
- Fixed Specifai LLM config Electron store issue when upgrading from v1.x to v2.x.

## [2.6.0]

### Added

- Integrated thinking process visualization for generate/re-generate workflows in stories and tasks, providing better transparency into AI decision-making
- Added support for Claude 4 models in LLM configurations, expanding available AI model options

### Enhancements

- Improved thinking progress events with structured message format for better input/output handling and traceability
- Enhanced login screen UX by adding window drag functionality, allowing users to reposition the application window

## [2.5.0]

### Added

- Support for custom Langfuse configurations via Settings.
- Integrated thinking process visualization in Create Solution workflow.

## [2.4.0]

### Added

- Upgraded the AI chat experience to be more interactive and responsive, including MCP tool integration and real-time streaming capabilities.
- Added agent-based workflow for better chat suggestions.
- Integrated HAI-Guardrails for enhanced security.

### Enhancements

- Applied consistent styling across the Single Solution page, header, input fields, and solution creation components for a cleaner and more polished UI experience.

## [2.3.0]

### Added

- Added Model Context Protocol (MCP) server configurations to Create Solution Flow, featuring predefined AWS Bedrock integration and support for multiple custom MCP servers, all manageable through Solution's Integrations section.
- Agentic workflow implementation for task and user story generation.

### Enhancements

- Switched to minimum threshold for preferred count in requirement generation.
- Refactored analytics settings toggle to depend on both PostHog and Langfuse configurations.
- Improved Home Screen UI for empty solutions handling.

### Fixed

- Resolved AWS Bedrock cross-region reference model connection issues.
- Fixed Solution Integrations page scrolling.
- Fixed login flow to require working directory selection.
- Upgraded spreadsheet export from xlsx to exceljs library.

## [2.2.2]

### Fixes

- Removed HAI Chat integration from requirements document add flow.
- Enhanced Business Process navigation with improved guards to prevent data loss and eliminate redundant popups.

## [2.2.1]

### Fixes

- Resolved an issue with the Create Solution when using AWS Bedrock models. Replaced the community package with the official @langchain/aws package and correctly configured the maxTokens parameter within the expected input path for the Bedrock model.

## [2.2.0]

### Added

- Implemented Agentic flow within the Create Solution workflow utilising LangGraph.

### Enhancements

- Disabled search functionality for the provider dropdown to streamline user interaction.

### Fixed

- Addressed an issue causing tasks to regenerate upon cancellation.
- Standardised font consistency in the Export dropdown menu by transitioning from Angular Material to Tailwind CSS.
- Prevented unintended solution requirement generation when Clean Solution is set to enabled in the Create Solution workflow.
- Resolved a click-related issue in the Export dropdown menu.
- Introduced a clear button to the select component for improved usability.
- Eliminated an unintended discard pop-up during the Add and Edit Requirement workflows.

## [2.1.1]

### Added

- Dialog service and builder for consistent modal management.
- Support for linking relevant BRDs in PRDs — linked BRDs are now passed as context during enhance requirement, add requirement, chat suggestions, and conversations.

### Enhancements

- Refactored the Settings page for improved organization and clarity.
- UI updates to the chat and include sections in requirement workflows.
- Prompt modal added for unsaved BRD–PRD mapping changes.

### Fixed

- Fixed issue where “Add to Description” persisted on Cancel for BRDs in Create Solution Trace flow.

## [2.1.0]

### Added

- Added Openrouter & Ollama Providers
- Added Langfuse Observability

### Enhancements

- Enhanced existing getModelOptions to function for better flexibility
- Added active provider to PostHog tracking

### Fixed

- Fixed Bedrock KB override to toggle only when bedrock credentials are present
- Fixed Loader Lag issues in user story task generaton

## [2.0.0]

### Added

- Migrated core backend from Python to electron IPC layer
- Added auto updater for the electron app
- Added support to access any AWS Bedrock Knowledge base
- Added feasibility for users to add own LLM Configuration

### Fixed

- Fixed unable to update/add task with AI
- Fixed instruction in requirement update prompt to output only single requirement
- Fixed user information getting cleared in login screen
- Fixed handling corrupted/invalid solution files during directory loading
- Fixed UI inconsistencies in BP and file upload button

## [1.9.10]

### Enhancements

- Added a rich text markdown editor across PRD, BRD, NFR, UIR, BP, User Story, and Task.
- Improved UI consistency and styling across upload code components.
- Added Gemini and Ollama (Backend) support
- Improved the numbering system at the solution level.
- Integrated PostHog for analytics tracking.
- Migrated the color palette from custom colors to Tailwind for a more harmonious design.

### Fixed

- Fixed the issue where the Jira port was already in use; users can now close the existing instance.
- Standardized the names of exported BRD, NFR, UIR, and User Stories.
- Fixed file reading issues during JIRA sync.

## [1.9.9]

### Enhancements

- Replaced the checkbox with a button for AI enhancement in the business process.
- Consolidated root directory selection into the settings modal.
- Added a configurable option to control the number of generated requirements.
- Made the user story export format consistent with the PRD export format and removed the CSV export option for PRD user stories.
- Introduced success and failure toast messages for task, user story generation, and regeneration.

## [1.9.8]

### Enhancements

- UI Fix for multi file upload and alignment
- Checkbox to Button for Enhance with AI for Root Requirements, User Stories and Tasks
- Allow users to export PRD (with stories and tasks), BRD, NFR, UIR and BP requirements
- Refactored the LLM module and added support for additional Bedrock models
- Font Updates and Styling Updates to Welcome Page
- Update methods to include AI in requirement, user story and task updates
- Removed FooterComponent and added new settings modal with improved UI and logout functionality
- Updated Header component layout, removed buttons and changed color scheme from secondary to slate
- Added company logo color configuration in environment files
- Updated branding from HAI BUILD to Specifai across configuration, assets, documentation and app description

### Fixed

- Fix for task chat to stay on same page
- Margin and disable buttons for invalid forms
- Keep the user on the same page after business process update
- Prevent solution creation with spaces-only input in required fields by trimming values before form submission

## [1.9.7]

### Enhancements

- Recurring suggestions for AI chat
- Editing requirements, user stories, and tasks now remains on the same page, avoiding unnecessary navigation.
- Improved chat prompt behavior to be concise, preserve existing content, and avoid explaining feature benefits.
- Reformatted PRDs, Screens, and Personas to improve readability by adding new lines before writing to the file.
- PRDs and BRDs are no longer appended to the business process description during addition or updates.
- PRDs and BRDs are now included as context when generating the business process flowchart.
- Added process flow diagram examples and guidelines to improve flowchart generation prompts.
- Updated business process add/update prompt to exclude marketing, promotional, or summarizing content.
- Added tooltips for Delete, Copy, Settings, Folder, and Logout icons to improve usability.
- Added Jira prerequisite message for better clarity.
- Updated suggestions layout to appear horizontally when chat history is not empty.

### Fixed

- Trimmed unnecessary white spaces and removed trailing slashes from the App URL before verification to prevent authentication failures.
- Resolved issue where chat history was disappearing in User Story.
- Fixed task chat breaking due to payload validation failure.

## [1.9.6]

### Added

- Added a clear search function to the search input

### Fixed

- Implemented validation for BP file associations in PRDs and BRDs before deletion
- Refined AI chat prompts to prevent code snippets in responses
- Removed default LLM provider settings in Electron, now fetching defaults from the backend

## [1.9.5]

### Added

- AI-powered document generation for BRDs, PRDs, NFRs, UIRs, and business process flows.
- Intelligent chat interface for real-time requirement edits and context-specific suggestions.
- Business process visualization and user story generation features.
- Multi-model support for Azure OpenAI, OpenAI Native, and AWS Bedrock models.
- Jira integration for automatic epic, story and task creation with bulk export capabilities.
- AWS Bedrock Knowledge Base for enhanced chat suggestions and historical data integration.
- Desktop application with seamless workflow tool integration, leveraging the local file system.
