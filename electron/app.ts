import { app, ipcMain, BrowserWindow, dialog, shell } from "electron";
import path from "path";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import { IncomingMessage, ServerResponse } from "http";
import net from "net";
import { exec } from "child_process";
import { createServer } from "http";
import Store from 'electron-store';
import { store as storeService } from './services/store';
import {getSuggestions} from './handlers/get-suggestions';
import { utilityFunctionMap } from "./file-system.utility";
import { verifyConfig } from "./handlers/verify-config";

dotenv.config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, ".env")
    : path.resolve(process.cwd(), ".env"),
});

const indexPath = app.isPackaged
  ? path.join(process.resourcesPath, "ui")
  : path.resolve(process.cwd(), "ui");

try {
  const store = new Store();
  storeService.initialize(store);

  ipcMain.handle("store-get", async (_event: Electron.IpcMainInvokeEvent, key: string) => {
    return storeService.get(key);
  });

  ipcMain.handle("store-set", async (_event: Electron.IpcMainInvokeEvent, key: string, value: any) => {
    storeService.set(key, value);
    return true;
  });

  ipcMain.handle("removeStoreValue", async (_event: Electron.IpcMainInvokeEvent, key: string) => {
    storeService.delete(key);
    return true;
  });
} catch (error) {
  console.error('Failed to initialize electron-store:', error);
}

ipcMain.handle("reloadApp", () => onAppReload());

const themeConfiguration = JSON.parse(process.env.THEME_CONFIGURATION || '{}');

ipcMain.handle("get-theme-configuration", () => themeConfiguration);

let mainWindow: BrowserWindow | null = null;
let clientId: string, clientSecret: string, redirectUri: string;

function getIconPath(): string {
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
      preload: path.join(__dirname, "preload.js"), // Note: This will be compiled from preload.ts
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, getIconPath()),
  });

    mainWindow.loadFile(`${indexPath}/index.html`, { 
      query: {},
      hash: 'apps'  // Set default route
    }).then(() => {
      console.debug("Welcome Page loaded successfully");
    }).catch((error) => {
      console.error("Failed to load welcome page:", error);
    });

  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
}

app.whenReady().then(async () => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("window-all-closed", () => app.quit());

  if (mainWindow) {
    mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: "deny" };
    });

    mainWindow.webContents.on(
      "did-fail-load",
      (_event: Electron.Event, errorCode: number, errorDescription: string, validatedURL: string) => {
        if (errorCode === -6) {
          console.error(
            `Failed to load URL: ${validatedURL}, error: ${errorDescription}`
          );
          onAppReload();
        }
      }
    );
  }

  ipcMain.handle("kill-port", async (_event: Electron.IpcMainInvokeEvent, port: number) => {
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

  function generateState(): string {
    return Math.random().toString(36).substring(2);
  }

  ipcMain.on("start-server", () => {
    const port = 49153;
    startServer(port);
  });

  ipcMain.on("start-jira-oauth", async (event: Electron.IpcMainEvent, oauthParams: { clientId: string; clientSecret: string; redirectUri: string }) => {
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

  ipcMain.on("refresh-jira-token", async (event: Electron.IpcMainEvent, { refreshToken }: { refreshToken: string }) => {
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
    const { canceled, filePaths } = await dialog.showOpenDialog({});
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
    async (_event: Electron.IpcMainInvokeEvent, fileContent: string, options: { rootPath: string; fileName: string } | null) => {
      if (!options) return null;

      let filePath = options.rootPath;

      if (!filePath) {
        const response = await dialog.showSaveDialog({});
        filePath = response.filePath || '';
        if (response.canceled) {
          return null;
        }
      }
      
      const dirForSave = `${filePath}/${options.fileName.split(options.fileName.split("/").pop()!)[0]}`;
      if (!fs.existsSync(dirForSave)) {
        fs.mkdirSync(dirForSave, { recursive: true });
      }
      fs.writeFileSync(`${filePath}/${options.fileName}`, fileContent, "utf-8");
      return filePath;
    }
  );

  ipcMain.handle('chat:getSuggestions', async (_event: Electron.IpcMainInvokeEvent, data: any) => {
    try {
      const result = await getSuggestions(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling chat:getSuggestions:', error.message);
      throw error;
    }
  });

  ipcMain.handle('verify-llm-config', async (_event: Electron.IpcMainInvokeEvent, data: any) => {
    try {
      const result = await verifyConfig(_event, data);
      return result;
    } catch (error: any) {
      console.error('Error handling verify-llm-config:', error.message);
      throw error;
    }
  });

  ipcMain.handle("dialog:openDirectory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (canceled) {
      return [];
    } else {
      return filePaths;
    }
  });

  ipcMain.handle("invokeCustomFunction", async (_event: Electron.IpcMainInvokeEvent, message: { functionName: string; params: any }) => {
    console.debug("message on invokeCustomFunction.");
    console.debug("map: ", utilityFunctionMap);
    const fn = utilityFunctionMap[message.functionName as keyof typeof utilityFunctionMap];
    return fn(message.params);
  });

  ipcMain.handle("show-error-message", async (_event: Electron.IpcMainInvokeEvent, errorMessage: string) => {
    mainWindow?.webContents.send("display-error", errorMessage);
  });

  ipcMain.on("load-url", (_event: Electron.IpcMainEvent, serverConfig: string) => {
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
});

ipcMain.handle("get-style-url", () => {
  return path.join(process.resourcesPath, "tailwind.output.css");
});

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

function onAppReload() {
  const currentHash = mainWindow?.webContents.getURL().split('#')[1] || '';
  mainWindow?.loadFile(`${indexPath}/index.html`, { 
    query: {},
    hash: currentHash || 'apps'
  }).then(() => {
    console.debug("Welcome Page reloaded successfully");
  }).catch((error) => {
    console.error("Failed to reload welcome page:", error);
  });
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}
