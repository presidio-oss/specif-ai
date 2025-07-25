import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../constants/app.constants";

export const joinPaths = (...segments: string[]): string => {
  return path.join(...segments);
};

export const getSpecifaiAppDataPath = () =>
  `${app.getPath("appData")}/${app.getName()}`;

export const ensureSettingsDirectoryExists = async () => {
  const settingsDir = path.join(getSpecifaiAppDataPath(), PATHS.APP_SETTINGS);
  await fs.mkdir(settingsDir, {
    recursive: true,
  });
  return settingsDir;
};

export const arePathsEqual = (path1?: string, path2?: string): boolean => {
  if (!path1 && !path2) {
    return true;
  }

  if (!path1 || !path2) {
    return false;
  }

  path1 = normalizePath(path1);
  path2 = normalizePath(path2);

  if (process.platform === "win32") {
    return path1.toLowerCase() === path2.toLowerCase();
  }

  return path1 === path2;
};

const normalizePath = (p: string): string => {
  // normalize resolve ./.. segments, removes duplicate slashes, and standardizes path separators
  let normalized = path.normalize(p);
  // however it doesn't remove trailing slashes
  // remove trailing slash, except for root paths
  if (
    normalized.length > 1 &&
    (normalized.endsWith("/") || normalized.endsWith("\\"))
  ) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
};