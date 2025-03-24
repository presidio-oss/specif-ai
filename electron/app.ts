import { app, ipcMain, BrowserWindow, shell } from "electron";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { IncomingMessage, ServerResponse } from "http";
import net from "net";
import { exec } from "child_process";
import { createServer } from "http";
import { setupFileSystemHandlers } from "./handlers/fs-handler";
import { setupStore } from "./handlers/store-handler";
import { setupCoreHandlers } from "./handlers/core-handler";
import { setupRequirementHandlers } from "./handlers/requirement-handler";
import { setupVisualizationHandlers } from "./handlers/visualization-handler";
import { setupFeatureHandlers } from "./handlers/feature-handler";
import { setupSolutionHandlers } from "./handlers/solution-handler";

// ========================
// CONFIGURATION
// ========================

function initializeConfig() {
  dotenv.config({
    path: app.isPackaged
      ? path.join(process.resourcesPath, ".env")
      : path.resolve(process.cwd(), ".env"),
  });

  return {
    indexPath: app.isPackaged
      ? path.join(process.resourcesPath, "ui")
      : path.resolve(process.cwd(), "ui"),
    themeConfiguration: JSON.parse(process.env.THEME_CONFIGURATION || '{}')
  };
}

// ========================
// WINDOW MANAGEMENT
// ========================

let mainWindow: BrowserWindow | null = null;

function getIconPath(themeConfiguration: any): string {
  const icons = themeConfiguration.appIcons;
  if (process.platform === "darwin") {
    return path.join(__dirname, icons.mac);
  } else if (process.platform === "win32") {
    return path.join(__dirname, icons.win);
  } else {
    return path.join(__dirname, icons.linux);
  }
}

function createWindow(indexPath: string, themeConfiguration: any) {
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 1200,
    minHeight: 850,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, getIconPath(themeConfiguration)),
  });

  mainWindow
    .loadFile(`${indexPath}/index.html`)
    .then(() => {
      console.debug("Welcome Page loaded successfully", indexPath);
    })
    .catch((error) => {
      console.error("Failed to load welcome page:", error);
    });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  return mainWindow;
}

function onAppReload(indexPath: string) {
  const currentHash = mainWindow?.webContents.getURL().split('#')[1] || '';
  mainWindow?.loadFile(`${indexPath}/index.html`).then(() => {
    console.debug("Welcome Page reloaded successfully", indexPath);
  }).catch((error) => {
    console.error("Failed to reload welcome page:", error);
  });
}

function setupWindowHandlers(window: BrowserWindow, indexPath: string) {
  window.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  window.webContents.on(
    "did-fail-load",
    (_event, errorCode: number, errorDescription: string, validatedURL: string) => {
      if (errorCode === -6) {
        console.error(
          `Failed to load URL: ${validatedURL}, error: ${errorDescription}`
        );
        // ipcMain.emit("reloadApp");
        onAppReload(indexPath);
      }
    }
  );
}

// ========================
// UI RELATED HANDLERS
// ========================

function setupUIHandlers(indexPath: string, themeConfiguration: any) {
  ipcMain.handle("reloadApp", () => onAppReload(indexPath));
  
  ipcMain.handle("get-theme-configuration", () => themeConfiguration);
  
  ipcMain.handle("get-style-url", () => {
    return path.join(process.resourcesPath, "tailwind.output.css");
  });
  
  ipcMain.handle("show-error-message", async (_event, errorMessage: string) => {
    mainWindow?.webContents.send("display-error", errorMessage);
  });

  ipcMain.on("load-url", (_event, serverConfig: string) => {
    if (serverConfig && isValidUrl(serverConfig)) {
      mainWindow?.loadURL(serverConfig)
        .then(() => {
          console.debug("URL loaded successfully");
        })
        .catch((error: Error) => {
          console.error("Failed to load URL:", error.message);
        });
    } else {
      console.error("Invalid or no server URL provided.");
    }
  });
}

// ========================
// JIRA OAUTH
// ========================

let clientId: string, clientSecret: string, redirectUri: string;

function generateState(): string {
  return Math.random().toString(36).substring(2);
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

async function exchangeToken(grantType: string, codeOrToken: string) {
  const tokenUrl = "https://auth.atlassian.com/oauth/token";
  const params: {
    grant_type: string;
    client_id: string;
    client_secret: string;
    redirect_uri?: string;
    code?: string;
    refresh_token?: string;
  } = {
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

  const response = await axios.post<TokenResponse>(tokenUrl, params, {
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

async function getCloudId(accessToken: string): Promise<string | null> {
  const accessibleResourcesUrl =
    "https://api.atlassian.com/oauth/token/accessible-resources";
  const cloudIdResponse = await axios.get<Array<{ id: string }>>(accessibleResourcesUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const resources = cloudIdResponse.data;
  return resources.length > 0 ? resources[0].id : null;
}

const authServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.method === "GET" && req.url?.startsWith("/callback")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const authorizationCode = url.searchParams.get("code");
    if (authorizationCode) {
      exchangeToken("authorization_code", authorizationCode)
        .then((authResponse) => {
          mainWindow?.webContents.send("oauth-reply", authResponse);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Authentication successful. You can close this tab.");
        })
        .catch((error) => {
          console.error("Error exchanging authorization code for access token.");
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Authentication failed.");
        });
    } else {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing authorization code.");
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found.");
  }
});

function startServer(port: number) {
  const server = net.createServer();
  server.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      mainWindow?.webContents.send(
        "port-error",
        `Port ${port} is already in use by another application.`
      );
    } else {
      mainWindow?.webContents.send(
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
      mainWindow?.webContents.send("server-started");
    });

    authServer.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        mainWindow?.webContents.send(
          "port-error",
          `Port ${port} is already in use.`
        );
      } else {
        mainWindow?.webContents.send(
          "port-error",
          `Server error: ${err.message}`
        );
      }
    });
  });
  server.listen(port);
}

function setupJiraHandlers() {
  ipcMain.handle("kill-port", async (_event, port: number) => {
    if (process.platform === "win32") {
      try {
        const { stdout } = await new Promise<{stdout: string, stderr: string}>((resolve, reject) => {
          exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
          });
        });
  
        const pids = [...new Set(
          stdout.trim().split('\n')
                .map(line => line.trim().split(/\s+/)[4])
                .filter(pid => pid && pid !== "0")
        )];

        if (pids.length === 0) {
          console.log(`No valid process found using port ${port}`);
          return { success: false, message: "No valid process found" };
        }
        
        for (const pid of pids) {
          await new Promise<void>((resolve, reject) => {
            exec(`taskkill /F /PID ${pid}`, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
        }
        
        console.log(`Port ${port} killed successfully.`);
        setTimeout(() => {
          startServer(port);
        }, 1000);
        
      } catch (error: any) {
        console.error(`Error killing port ${port}:`, error.message);
      }
    } else {
      exec(`lsof -i tcp:${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (error) => {
        if (error) {
          console.error(`Error killing port ${port}:`, error.message);
        } else {
          console.log(`Port ${port} killed successfully.`);
          setTimeout(() => {
            startServer(port);
          }, 1000); 
        }
      });
    }
  });

  ipcMain.on("start-server", () => {
    const port = 49153;
    startServer(port);
  });

  ipcMain.on("start-jira-oauth", async (event, oauthParams: { clientId: string; clientSecret: string; redirectUri: string }) => {
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
    try {
      await shell.openExternal(authURL);
    } catch (error) {
      console.error("Failed to open authorization URL:", error);
    }
  });

  ipcMain.on("refresh-jira-token", async (event, { refreshToken }: { refreshToken: string }) => {
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
}

// ========================
// UTILITY FUNCTIONS
// ========================

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

// ========================
// MAIN APPLICATION LOGIC
// ========================

app.whenReady().then(async () => {
  // Initialize configuration
  const { indexPath, themeConfiguration } = initializeConfig();
  
  // Setup store
  setupStore();
  
  // Create main window
  mainWindow = createWindow(indexPath, themeConfiguration);
  
  // Register app lifecycle handlers
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(indexPath, themeConfiguration);
    }
  });

  app.on("window-all-closed", () => app.quit());
  
  if (mainWindow) {
    // Setup window event handlers
    setupWindowHandlers(mainWindow, indexPath);
    
    // Register all IPC handlers
    setupFileSystemHandlers();
    setupUIHandlers(indexPath, themeConfiguration);
    setupJiraHandlers();
    setupCoreHandlers();
    setupRequirementHandlers();
    setupVisualizationHandlers();
    setupFeatureHandlers();
    setupSolutionHandlers();
  }
});
