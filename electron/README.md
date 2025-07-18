# 🖥️ Specifai Desktop Application - Electron

The Electron-based desktop application for Specifai facilitates local file system integration for all generated documents, providing a seamless user experience across platforms.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Building](#building)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- 📂 Local File System Integration.
- 📄 Document Management.
- 🚀 Cross-Platform Support.

## 🛠️ Prerequisites

- Node.js >= 20.x
- npm >= 9.6.7

## 💻 Development Setup

### Installation

To install the necessary dependencies, run the following command:

```bash
npm install
```

### Development Mode

1. **Build Angular UI Application**: 
   - Navigate to the `ui/` directory and install all necessary npm packages using the command below:
     ```bash
     npm install
     ```
   - Start the UI (renderer) development server using the command below:
     ```bash
     npm run start
     ```

3. **Start the Application**: Once the Angular UI is compiled and the build files are copied to the Electron directory, build and launch the Electron application:
   ```bash
   npm run start
   ```

## 🏗️ Building

1. **Configure Code Signing**:
   - **Default**: Enabled for macOS.
   - **Disable**: Remove the following from `package.json` to disable:
     ```json
     "appId": "<your app id>",
     "forceCodeSigning": true
     ```
   - **Certificate Configuration**: Set up the certificate in `build-assets/build-mac.sh`.
   - **Notarization**: Update `package.json` for Mac application notarization:
     ```json
     {
       "notarize": {        
         "teamId": "<team id>"      
       }
     }
     ```
   - **Enforcement**: Ensure code signing is enforced by verifying the configuration in `package.json` and `build-assets/build-mac.sh`.

3. **Build the Application**: Execute the build script:
   ```bash
   ./build-assets/build-mac.sh
   ```
   This script compiles the application into a distributable format, ready for deployment.

## 🤝 Contributing

Please read our [Contributing Guidelines](../CONTRIBUTING.md) for details on submitting patches and the contribution workflow.

## 🛠️ Troubleshooting

- **Issue**: Application fails to start.
  - **Solution**: Ensure all dependencies are installed and the Angular UI is built before starting the Electron app.

- **Issue**: Code signing errors occur.
  - **Solution**: Verify the certificate configuration in `build-assets/build-mac.sh` and `package.json`.

- **Issue**: If you encounter an issue such as "Port Error: Port 49152 is already in use by another application" while running Electron, follow these steps to resolve it:

   1. Check for processes running on the port:

      Use the following command to identify the process using the port:
      ```
      lsof -ti:<port-number>

      #For MAC users
      sudo lsof -i :<port-number>
      ```
     
   2. Kill the process:

      Terminate the process using the command below, then re-run the Electron app:
      ```
      kill -9 <process-id>
      
      #For MAC users
      sudo kill -9 <process-id>
      ```