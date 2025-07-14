import { app } from "electron";
import fs, { appendFile } from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../constants/app.constants";
import { UsecaseDraft } from "../schema/core/usecase.schema";
import * as mammoth from "mammoth";

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

export const appendUsecaseRequirement = async (
  workingDir: string,
  data: Omit<UsecaseDraft, "id">
): Promise<Omit<UsecaseDraft, "id">> => {
  const filePath = path.join(workingDir, "SI");
  console.log("Appending proposal requirement to:", filePath);
  await appendFile(filePath, JSON.stringify(data) + "\n");
  return { ...data };
};

export const extractTextFromDocx = async (filePath: string): Promise<string> => {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value.replace(/\s|/g, " ").trim().slice(0,4000);
};