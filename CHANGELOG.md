# Changelog

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
