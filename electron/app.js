const { app, ipcMain, BrowserWindow, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const express = require("express");
const axios = require("axios");
require("dotenv").config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, ".env")
    : path.resolve(process.cwd(), ".env"),
});

const indexPath = app.isPackaged
  ? path.join(process.resourcesPath, "ui")
  : path.resolve(process.cwd(), "ui");
const net = require("net");
const { exec } = require("child_process");
let store;

(async () => {
  const Store = (await import("electron-store")).default;
  store = new Store();
})();

ipcMain.handle("store-get", async (event, key) => {
  return store ? store.get(key) : null;
});

ipcMain.handle("store-set", async (event, key, value) => {
  if (store) {
    store.set(key, value);
    return true;
  }
  return false;
});

ipcMain.handle("reloadApp", () => onAppReload());

// Register handler for removeStoreValue
ipcMain.handle("removeStoreValue", async (event, key) => {
  if (store) {
    store.delete(key);
    return true;
  }
  return false;
});

// Update env variable ENABLE_SENTRY in sentry.env to true for enabling sentry.
// Also update SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE values accordingly.
const enableSentry = process.env.ENABLE_SENTRY;
const authServer = express();
authServer.disable("x-powered-by");

const themeConfiguration = JSON.parse(process.env.THEME_CONFIGURATION);

ipcMain.handle("get-theme-configuration", () => themeConfiguration);

if (enableSentry) {
  console.debug("Configuring sentry for the electron application.");
  const { init, IPCMode } = require("@sentry/electron/main");
  init({
    dsn: process.env.SENTRY_DSN,
    debug: false, // Set debug value to false for production and true for development or debugging
    ipcMode: IPCMode.Protocol,
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.SENTRY_RELEASE,
  });
} else {
  console.debug("Sentry configuration is disabled.");
}

const { utilityFunctionMap } = require("./file-system.utility");

let mainWindow;
let clientId, clientSecret, redirectUri;

// Set the path to the icon file
function getIconPath() {
  const icons = themeConfiguration.appIcons;
  if (process.platform === "darwin") {
    return path.join(__dirname, icons.mac);
  } else if (process.platform === "win32") {
    return path.join(__dirname, icons.win);
  } else {
    return path.join(__dirname, icons.linux);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 1200,
    minHeight: 850,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
    // Uncomment the below line to set the icon for the application
    icon: path.join(__dirname, getIconPath()),
  });

  mainWindow.loadFile(`${indexPath}/index.html`).then(() => {
    console.debug("Welcome Page loaded successfully");
  });

  // Open the DevTools - uncomment this line before production build
  // mainWindow.webContents.openDevTools();

  // Add electron-reload to watch the electron directory
  // require('electron-reload')(__dirname, {
  //   electron: path.join(__dirname, "node_modules", ".bin", "electron"),
  //   forceHardReset: true,
  //   hardResetMethod: 'exit'
  // });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  mainWindow.on("reload", () => onAppReload());

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("window-all-closed", () => app.quit());
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      if (errorCode === -6) {
        // ERR_FILE_NOT_FOUND
        console.error(
          `Failed to load URL: ${validatedURL}, error: ${errorDescription}`
        );
        onAppReload();
      }
    }
  );

  ipcMain.handle("kill-port", async (event, port) => {
    const command =
      process.platform === "win32"
        ? `netstat -ano | findstr :${port} | for /F "tokens=5" %P in ('more') do TaskKill /F /PID %P`
        : `lsof -i tcp:${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error killing port ${port}:`, error.message);
        event.sender.send("kill-port-error", error.message);
      } else {
        console.log(`Port ${port} killed successfully.`);
        event.sender.send(
          "kill-port-success",
          `Port ${port} killed successfully.`
        );
        setTimeout(() => {
          startServer(port);
        }, 1000); 
      }
    });
  });

  app.on("reload", () => onAppReload());

  function generateState() {
    return Math.random().toString(36).substring(2);
  }

  ipcMain.on("start-server", () => {
    // Auth Server used for Jira Integration OAuth Process
    const port = 49153;
    startServer(port);
  });

  ipcMain.on("start-jira-oauth", (event, oauthParams) => {
    console.debug("Received OAuth parameters.");
    clientId = oauthParams.clientId;
    clientSecret = oauthParams.clientSecret;
    redirectUri = oauthParams.redirectUri;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("Missing OAuth parameters");
      return;
    }

    const authURL = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=read%3Ajira-user%20read%3Ajira-work%20write%3Ajira-work%20offline_access&redirect_uri=${encodeURIComponent(redirectUri)}&state=${generateState()}&response_type=code&prompt=consent`;

    console.log("Opening authorization URL.");
    shell.openExternal(authURL).then();
  });

  ipcMain.on("refresh-jira-token", async (event, { refreshToken }) => {
    console.debug("Received refresh token request.");
    try {
      const authResponse = await exchangeToken("refresh_token", refreshToken);
      event.sender.send("oauth-reply", authResponse);
      console.log("Access token refreshed and sent to renderer.");
    } catch (error) {
      console.error("Error refreshing access token.");
      event.sender.send("oauth-reply", null);
    }
  });

  ipcMain.handle("dialog:openFile", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog();
    if (canceled) {
      return null;
    } else {
      const filePath = filePaths[0];
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return { filePath, fileContent };
    }
  });

  ipcMain.handle(
    "dialog:saveFile",
    async (event, fileContent, options = null) => {
      let filePath = options.rootPath;

      if (!filePath) {
        const response = await dialog.showSaveDialog();
        filePath = response.filePath;
        if (response.canceled) {
          return null;
        }
      }
      const dirForSave = `${filePath}/${options.fileName.split(options.fileName.split("/").pop())[0]}`;
      if (!fs.existsSync(dirForSave)) {
        fs.mkdirSync(dirForSave, { recursive: true });
      }
      fs.writeFileSync(`${filePath}/${options.fileName}`, fileContent, "utf-8");
      return filePath;
    },
  );

  ipcMain.handle("dialog:openDirectory", async (_event, _message) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled) {
      return [];
    } else {
      return filePaths;
    }
  });

  ipcMain.handle("invokeCustomFunction", async (event, message) => {
    console.debug("message on invokeCustomFunction.");
    console.debug("map: ", utilityFunctionMap);
    return utilityFunctionMap[message.functionName](message.params);
  });

  // New handler to show error message
  ipcMain.handle("show-error-message", async (event, errorMessage) => {
    mainWindow.webContents.send("display-error", errorMessage);
  });

  authServer.get("/callback", async (req, res) => {
    const authorizationCode = req.query.code;
    try {
      const authResponse = await exchangeToken(
        "authorization_code",
        authorizationCode,
      );
      mainWindow.webContents.send("oauth-reply", authResponse);
      res.send("Authentication successful. You can close this tab.");
    } catch (error) {
      console.error(
        "Error exchanging authorization code for access token.",
      );
      res.status(500).send("Authentication failed.");
    }
  });

  ipcMain.on("load-url", (event, serverConfig) => {
    if (serverConfig && isValidUrl(serverConfig)) {
      mainWindow
        .loadURL(serverConfig)
        .then(() => {
          console.debug("URL loaded successfully");
        })
        .catch((error) => {
          console.error("Failed to load URL.");
        });
    } else {
      console.error("Invalid or no server URL provided.");
    }
  });
});

ipcMain.handle("get-style-url", () => {
  return path.join(process.resourcesPath, "tailwind.output.css");
});

function startServer(port) {
  const server = net.createServer();
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      mainWindow.webContents.send(
        "port-error",
        `Port ${port} is already in use by another application.`
      );
    } else {
      mainWindow.webContents.send(
        "port-error",
        `Failed to start server: ${err.message}`
      );
    }
  });

  server.once("listening", () => {
    server.close();
    authServer.listen(port, () => {
      console.debug(
        `OAuth callback server listening on http://localhost:${port}/callback`
      );
      mainWindow.webContents.send("server-started");
    });

    authServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        mainWindow.webContents.send(
          "port-error",
          `Port ${port} is already in use.`
        );
      } else {
        mainWindow.webContents.send(
          "port-error",
          `Server error: ${err.message}`
        );
      }
    });
  });
  server.listen(port);
}

async function exchangeToken(grantType, codeOrToken) {
  const tokenUrl = "https://auth.atlassian.com/oauth/token";
  const params = {
    grant_type: grantType,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: grantType === "authorization_code" ? redirectUri : undefined,
  };

  if (grantType === "authorization_code") {
    params.code = codeOrToken;
  } else if (grantType === "refresh_token") {
    params.refresh_token = codeOrToken;
  }

  const response = await axios.post(tokenUrl, params, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  const { access_token, refresh_token, expires_in, token_type } = response.data;

  const expirationDate = new Date();
  expirationDate.setSeconds(expirationDate.getSeconds() + expires_in);

  const cloudId = await getCloudId(access_token);

  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    expirationDate: expirationDate.toISOString(),
    tokenType: token_type,
    cloudId: cloudId,
  };
}

async function getCloudId(accessToken) {
  const accessibleResourcesUrl =
    "https://api.atlassian.com/oauth/token/accessible-resources";
  const cloudIdResponse = await axios.get(accessibleResourcesUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const resources = cloudIdResponse.data;
  return resources.length > 0 ? resources[0].id : null;
}

function onAppReload() {
  mainWindow.loadFile(`${indexPath}/index.html`).then(() => {
    console.debug("Welcome Page reloaded successfully");
  });
}

// Helper function to validate URLs
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}
