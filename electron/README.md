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

1. **Enable Development Features**: In `app.js`, uncomment the following lines to enable hot-reloading and open developer tools for debugging:
   ```javascript
   mainWindow.webContents.openDevTools();

   require('electron-reload')(__dirname, {
      electron: path.join(__dirname, "node_modules", ".bin", "electron"),
      forceHardReset: true,
      hardResetMethod: 'exit'
   });
   ```

2. **Build Angular UI Application**: 
   - Navigate to the `ui/` directory and install all necessary npm packages using the command below:
     ```bash
     npm install
     ```
   - Then, navigate back to the `electron` directory and build the Angular application to prepare it for integration with Electron. This will copy the build files to the `electron/ui` directory:
     ```bash
     npm run build:ui
     ```
   - To automatically rebuild and reflect changes in the Electron application when making changes to `ui/`, run:
     ```bash
     npm run watch:ui
     ```

3. **Start the Application**: Once the Angular UI is compiled and the build files are copied to the Electron directory, launch the Electron application:
   ```bash
   npm run serve:electron
   ```

> **Note**: Ensure the Angular UI build (step 2) is completed before starting step 3.

## 🏗️ Building

1. **Disable Development Features**: Ensure that developer tools are disabled in production to prevent exposure of sensitive information. Comment out the development-specific lines in `app.js`:
   ```javascript
   // mainWindow.webContents.openDevTools();

   // require('electron-reload')(__dirname, {
   //   electron: path.join(__dirname, "node_modules", ".bin", "electron"),
   //   forceHardReset: true,
   //   hardResetMethod: 'exit'
   // });
   ```

2. **Configure Code Signing**:
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

- **Issue**: If you encounter an issue such as "Port Error: Port 49153 is already in use by another application" while running Electron, follow these steps to resolve it:

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