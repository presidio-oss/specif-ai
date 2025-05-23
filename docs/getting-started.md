# Getting Started with Specifai 🚀

Welcome to Specifai - your AI-powered companion for revolutionizing the SDLC process! This guide will walk you through setting up and getting started with Specifai, ensuring you're ready to transform your project requirements management in no time.

## 📥 Download and Installation

### Latest Release
Get started by downloading Specifai App for your operating system:

- **Windows**: [Download Specifai for Windows](https://github.com/presidio-oss/specif-ai/releases/download/v2.4.0/Specif-AI-Setup-2.4.0.exe)
- **macOS**: [Download Specifai for macOS](https://github.com/presidio-oss/specif-ai/releases/download/v2.4.0/Specif-AI-2.4.0-arm64.dmg)

You can also visit our [releases page](https://github.com/presidio-oss/specif-ai/releases/tag/v2.4.0) to view release notes and all available versions.

### Installation Steps

#### For Windows Users
1. Double-click the downloaded `.exe` file
2. Follow the installation wizard
3. Allow any security permissions if prompted
4. Wait for the installation to complete

#### For macOS Users
1. Open the downloaded `.dmg` file
2. Drag Specifai to your Applications folder
3. Right-click the app and select "Open" (first-time only)
4. Click "Open" in the security dialog

## 🎯 First-Time Setup

When you first launch Specifai, you'll be landed on the login screen:

![Welcome Screen](assets/welcome-page.png)

### 1. User Profile Setup
- Enter your preferred username
  * This will identify your work within Specifai
  * Example: "john.doe" or "sarah.dev"

### 2. Workspace Configuration
- Choose the destination folder where Specifai stores the Solution artifacts.
- Click "Browse" to select your workspace directory that is:
  * Easily accessible
  * Contains necessary file permission for Specifai to read and write files
  * Has sufficient storage space
  * Can be backed up regularly
  * Ideally synced with cloud storage (OneDrive, Dropbox, etc.)

### 3. LLM Configuration 🤖

Specifai supports multiple AI models. Let's set up your preferred model:

1. Click on Settings ⚙️ in the top right
![Settings Screen](assets/settings-screen-llm-config.png)
2. Navigate to "LLM Configuration"
3. Choose the model that best suits your needs. Supported models include:
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

4. Enter your LLM credentials

### 4. Settings Configuration ⚙️

Specifai provides several configuration options to customize your experience:

#### Analytics
Configure analytics and data collection preferences:
- **Enable Analytics Tracking**: Toggle to enable/disable usage analytics
- **Use Custom Langfuse Account**: Option to use your own Langfuse account for analytics

TODO: Add Image for custom langfuse account

#### Destination
- Earlier selected Destination HAI Root folder will be displayed. Specifai solution artifacts files are stored in this folder location. 
- If you would like to update, Click "Browse" to select your workspace directory that is:
  * Easily accessible
  * Contains necessary file permission for Specifai to read and write files
  * Has sufficient storage space
  * Can be backed up regularly
  * Ideally synced with cloud storage (OneDrive, Dropbox, etc.)

#### Update Management
Configure automatic updates and version management:
- **Automatic Updates**: Toggle to enable/disable automatic application updates
- **Check for Updates**: Manually check for and install new versions of Specifai.

#### Saving Changes
- Click "Save" at the bottom of the screen to apply your changes.
- Click "Discard" to revert any unsaved changes.

Verify if the configurations were saved successfully without any issues.

## 📂 Solution Organization

Specifai organizes your solutions in a clear, structured format:

### Solution Structure

Each solution is housed within its own directory under the root folder. The folder structure is modular and scalable, allowing teams to manage distinct aspects of the solution independently while maintaining coherence.

```
📁 Solution Root Folder
├── Solution 1 
│   ├── 📄 .metadata.json          # Solution configuration
│   ├── 📁 BRD                     # Business Requirements
│   │    ├── 📄 BRD01-base.json        
│   │    └── 📄 BRDxx-[topic].json    
│   ├── 📁 NFR                     # Non-Functional Requirements
│   │    ├── 📄 NFR01-base.json        
│   │    └── 📄 NFRxx-[topic].json  
│   ├── 📁 PRD                     # Product Requirements
│   │    ├── 📄 PRD01-base.json  
│   │    ├── 📄 PRD01-feature.json     # User Stories & Tasks of PRD01     
│   │    └── 📄 PRDxx-[topic].json  
│   └── 📁 UIR                     # User Interface Requirements
│        ├── 📄 UIR01-base.json        
│        └── 📄 UIRxx-[component].json  
└── Solution 2
    ├── ...

```

### 📁 Folder Types

#### 🔖 Metadata Configuration

Each solution contains a `.metadata.json` file that centralizes configuration and descriptive metadata. This enables tooling integration, solution-level auditability, and environment setup.

**Typical Fields**:

* `solutionName`: Human-readable name of the solution
* `description`: Summary of purpose and functionality
* `techStack`: Primary technologies used (e.g., React, Node.js, AWS)
* `createdAt`: Metadata for change tracking
* Other metadata about the solution including configuration for MCP Tools.

---

#### **BRD (Business Requirements Document)**

* **Purpose**: Captures high-level business objectives, goals, and stakeholder expectations.
* **Format**: Modular JSON files (`BRD01-base.json`)
* **Audience**: Product Owners, Business Analysts, Stakeholders
* **Usage**: Drives the overall scope and prioritization of product features.

---

#### **PRD (Product Requirements Document)**

* **Purpose**: Translates business needs into detailed, actionable technical requirements.
* **Format**: Feature-focused JSON files (`PRD01-base.json`)
* **Audience**: Engineers, QA, Architects
* **Usage**: Forms the basis for design, development, and test planning.

---

#### **User Stories**

* **Purpose**: Defines user-centric features Broken down from PRD in an Agile-friendly format.
* **Format**: Embedded within PRD folder (`PRD01-feature.json`)
* **Structure**: `As a [role], I want [feature] so that [benefit]`
* **Usage**: Tracked in project management systems to monitor progress and dependencies.

---

#### **Tasks**

* **Purpose**: Breaks down user stories or requirements into executable units of work.
* **Format**: Linked to PRD folder (`PRD01-feature.json`)
* **Audience**: Developers, Testers
* **Usage**: Tracked in project management systems to monitor progress and dependencies.

---

#### **UIR (User Interface Requirements)**

* **Purpose**: Defines UI/UX standards, layout behaviors, design patterns, and accessibility compliance.
* **Format**: Component or screen-specific files (`UIR01-base.json`)
* **Audience**: Front-End Developers, UX/UI Designers
* **Usage**: Ensures visual and interactive consistency across the application.

---

#### **NFR (Non-Functional Requirements)**

* **Purpose**: Specifies system-wide operational and technical constraints including performance, security, and compliance.
* **Format**: Categorized JSON files (`NFR01-base.json`)
* **Audience**: Architects, DevOps, Security Teams
* **Usage**: Guides architectural decisions and SLA definitions.

---
   

## 🎉 Next Steps

Congratulations! You're now ready to:
1. [Create your first solution](core-features.md#solution-creation-and-management)
2. [Set up integrations](integrations-setup.md) (Jira, AWS Bedrock)
3. [Explore AI-powered features](core-features.md#ai-powered-document-generation)

## 🆘 Troubleshooting

### Common Issues and Solutions

1. **Application Won't Start**
   - Verify system requirements
   - Check internet connection
   - Run as administrator (Windows)
   - Check system logs

2. **Workspace Access Issues**
   - Verify folder permissions
   - Choose a different location
   - Close other applications using the folder

3. **AI Model Connection Failed**
   - Double-check API credentials
   - Verify internet connection
   - Check API key validity
   - Ensure correct model selection

### Getting Help

If you need assistance:
1. Check our [Troubleshooting Guide](troubleshooting.md)
2. Visit our [GitHub Issues](https://github.com/presidio-oss/specif-ai/issues)
3. Contact support: hai-feedback@presidio.com

Remember: Specifai is here to make your development process smoother and more efficient. Don't hesitate to reach out if you need help getting started!
