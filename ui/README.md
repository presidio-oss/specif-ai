# 🎨 Specifai - Angular UI

The modern, responsive frontend application for Specifai, built with Angular and integrated with Electron for desktop deployment.

## Table of Contents
- [Features](#features)
- [Technical Stack](#technical-stack)
- [Development Setup](#development-setup)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- 📝 Document Generation Interface.
- 💬 AI-Powered Chat Interface.
- 📊 Business Process Flow Visualization.
- 🔄 Real-time Updates.

## 🛠 Technical Stack

- **Framework**: Angular 16.2.1 - Chosen for its robust features, scalability, and ease of integration with Electron.

## 💻 Development Setup

### Prerequisites

- Node.js >= 20.x
- npm >= 9.6.7
- Angular CLI

### Installation

To install the necessary dependencies, run the following command:

```bash
# Install dependencies
npm install
```
This command installs all the required Node.js packages listed in the `package.json` file.

### Setup Environment

Environments are managed in the `src/environments/<filename>.ts` directory. You can create multiple environment files for different stages as required.

### UI Build

As this is an Electron application built with Angular, the UI can be directly built from the `electron` directory and then executed as an Electron app.

Please refer to the [Electron Desktop Application Setup](../electron/README.md) for detailed instructions on building and running the application.

## 🤝 Contributing

Please read our [Contributing Guidelines](../CONTRIBUTING.md) for details on submitting patches and the contribution workflow.

## Troubleshooting

- **Issue**: UI does not render correctly.
  - **Solution**: Ensure all dependencies are installed and the environment is correctly set up.
- **Issue**: Build errors occur.
  - **Solution**: Verify that the Angular CLI version and Node.js version match the prerequisites.
- **Issue**: Environment configuration errors occur.
  - **Solution**: Ensure that the environment files in `src/environments/` are correctly configured.
