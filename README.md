<div align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" />
  <img src="https://img.shields.io/github/issues/presidio-oss/specif-ai" alt="Issues" />
  <img src="https://img.shields.io/github/stars/presidio-oss/specif-ai" alt="Stars" />
  <img src="https://img.shields.io/github/forks/presidio-oss/specif-ai" alt="Forks" />
</div>
<br />
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/img/hai-specif-ai-light.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/img/hai-specif-ai-theme.svg">
    <img alt="HAI Logo" src="assets/img/hai-specif-ai-theme.svg" height="auto">
  </picture>
</div>
<br />  
<div align="center">
  <em>Accelerate your SDLC process with AI-powered intelligence.<br>
  From ideas to actionable tasks in minutes.</em>
</div>
<br>

# 🚀 Specifai

**Specifai** is an AI-powered platform that transforms the project requirements management. It combines AI technology with intuitive workflows to automate documentation, generate and manage tasks - all while adapting to your team's specific needs.
<div align="center">
    <img src="assets/gifs/specif-ai-overview.gif" alt="Specifai in Action" width="900">
</div>

## Table of Contents
- [🌟 Overview](#overview)
- [📥 Getting Started](#getting-started)
- [✨ Key Features](#key-features)
   - [🔌 Integrations](#integrations)
- [🏗 Architecture](#architecture)
- [📝 Version-Controlled Requirements Management](#version-controlled-requirements-management)
- [🗺 Roadmap](#roadmap)
- [🤝 Contributing](#contributing)
- [📜 License](#license)
- [📧 Contact](#-contact)

## 🌟 Overview

In today's fast-paced software development landscape, delivering high-quality solutions quickly is more critical than ever. Specifai is a cutting-edge platform that revolutionizes how teams generate, manage, and refine software requirements by combining AI intelligence with human context.

By simply providing a solution name, description, and tech stack details, Specifai automatically generates comprehensive documentation, including:

- 📄 Business Requirement Documents (BRD)
- 🔧 Non-Functional Requirements Documents (NFRD)
- 📱 Product Requirement Documents (PRD)
- 🎨 User Interface Requirements (UIR)
- 🔄 Business Process Flows

<div align="center">
    <img src="assets/gifs/specif-ai-sections.gif" alt="Document Generation Demo" width="900">
</div>

## 📥 Getting Started

<img src="assets/img/specif-ai-welcome-page.png" alt="Welcome Page" width="900" />

1. **Download the Specifai desktop application** from the [releases page](https://github.com/presidio-oss/specif-ai/releases).
2. **Start** the Desktop Application
3. **Enter the Username and Working directory and get started!**

### 🧩 For Developers
1. **Clone the repository**
   ```bash
   git clone https://github.com/presidio-oss/specif-ai.git
   cd specif-ai
   ```
2. **Set up the development environment**
   - [Electron Desktop Application Setup](./electron/README.md)
   - [Angular UI Setup](./ui/README.md)

## ✨ Key Features

- **🤖 AI-Powered Document Generation**: Effortlessly create detailed SDLC documentation.
- **💬 Intelligent Chat Interface**: Get real-time requirement edits and context-specific suggestions.

<div align="center">

![AI powered chat feature in action](assets/gifs/specif-ai-chat.gif)  
*AI powered chat feature in action*

</div>

- **📊 Business Process Visualization**: Easily generate and manage process flows.
- **📋 User Story Generation**: Convert requirements into actionable user stories and tasks.

<div align="center">

![User story and task generation](assets/gifs/specif-ai-user-stories.gif)  
*User story and task generation*
</div>

- **🔄 Real-time Collaboration**: Collaborate and refine requirements with team members.
- **📱 Desktop Integration**: Seamlessly integrate with your existing workflow tools.
- **📊 Analytics & Observability**: Optional analytics and observability tracked in PostHog and Langfuse.
- **🔄 Multi-Model Support**: Choose the model that best suits your needs. Supported models include:
   - Azure OpenAI
      - gpt-4o
      - gpt-4o-mini
   - OpenAI Native
      - gpt-4o
      - gpt-4o-mini
   - AWS Bedrock
      - anthropic.claude-3-7-sonnet-20250219-v1:0
      - anthropic.claude-3-5-sonnet-20241022-v2:0
      - anthropic.claude-3-5-haiku-20241022-v1:0
      - anthropic.claude-3-5-sonnet-20240620-v1:0
      - anthropic.claude-3-opus-20240229-v1:0
      - anthropic.claude-3-sonnet-20240229-v1:0
      - anthropic.claude-3-haiku-20240307-v1:0
   - Gemini
      - gemini-2.0-flash-001
      - gemini-2.0-flash-lite-preview-02-05
      - gemini-2.0-pro-exp-02-05
      - gemini-2.0-flash-thinking-exp-01-21
      - gemini-2.0-flash-thinking-exp-1219
      - gemini-2.0-flash-exp
      - gemini-1.5-flash-002
      - gemini-1.5-flash-exp-0827
      - gemini-1.5-flash-8b-exp-0827
      - gemini-1.5-pro-002
      - gemini-1.5-pro-exp-0827
      - gemini-exp-1206
   - OpenRouter
   - Ollama

<div align="center">

![Model Switch](assets/gifs/specif-ai-settings.gif)  
*Easily configurable multi provider support*

</div>


### 🔌 Integrations

Specifai seamlessly integrates with popular tools to enhance your workflow:

#### Jira Integration
The stories and tasks generated as part of the solutions can be used to create actual stories and tasks in your Jira instance using the Jira integration provided by the application. Features include:
- Automatic story and task creation in Jira.
- Bulk export capabilities.

For Jira setup instructions, please refer to our [Jira Setup Guide](/ui/JIRA-README.md).

#### AWS Bedrock Knowledge Base
The enterprise knowledge base is integrated with AI-powered chat to enhance suggestions and enable iterative conversations for Business Requirement Documents (BRDs), Product Requirement Documents (PRDs), Non-functional Requirements, User Stories, and Tasks. Features include: 

- Enhanced chat suggestions through enterprise knowledge.
- Context-aware requirement generation.
- Historical data integration.

## 🏗 Architecture

Specifai follows a modern, scalable architecture designed for optimal performance and maintainability.

<div align="center">

![Specifai Architecture](assets/gifs/specif-ai-architecture.gif)  
*Specifai Architecture*

</div>

## 📝 Version Controlled Requirements Management Made Easy

Specifai is a powerful desktop application built to streamline and organize your project requirements. With Specifai, users can create a unified directory where all essential files are not only accessible and editable but also seamlessly synced with platforms like OneDrive, Dropbox, or any git-enabled local folder. This setup allows users to point to specific artifacts and data sources in a version-controlled environment, making collaboration and tracking effortless. Our goal is to enhance your development workflow by integrating seamlessly with the tools you already use, without adding complexity or obstacles.


## 🗺 Roadmap

- [ ] Advanced BRD-PRD linking capabilities.
- [ ] Enhanced collaboration features.
- [ ] Custom template support.
- [ ] v2.0 - Web version with enhanced collaboration capabilities.

## 🤝 Contributing

To contribute to the project, start by exploring [open issues](https://github.com/presidio-oss/specif-ai/issues) or checking our [feature request board](https://github.com/presidio-oss/specif-ai/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop).

Please read our [Contributing Guidelines](./CONTRIBUTING.md) for more details.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Thanks to all contributors and users for their support and feedback.

<a href="https://github.com/presidio-oss/specif-ai/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=presidio-oss/specif-ai" />
</a>

## 📧 Contact

For any questions or feedback, please contact us at [hai-feedback@presidio.com](mailto:hai-feedback@presidio.com).