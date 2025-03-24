import * as fs from "fs";
import * as pathModule from "path";
import { promises as fsPromise } from "fs";

interface DirectoryMetadata {
  [key: string]: any;
}

interface FileParams {
  path: string;
}

interface ContentParams extends FileParams {
  content: string;
}

interface DirectoryParams extends FileParams {
  metadata: DirectoryMetadata;
}

interface DirectoryListParams extends FileParams {
  constructTree: boolean;
  filterString: string;
}

interface AppendFileParams extends ContentParams {
  featureFile: string;
  baseFileCount: number;
}

interface FileChunkParams extends FileParams {
  filterString: string;
}

export const utilityFunctionMap = {
  createDirectoryWithMetadata: createDirectoryWithMetadata,
  readDirectoryMetadata: readDirectoryMetadata,
  createEmptyFile: createEmptyFile,
  createFileWithContent: createFileWithContent,
  readFromFile: readFromFile,
  writeFile: writeFile,
  getDirectoryList: getDirectoryList,
  readFileChunk: readFileChunk,
  appendFile: appendFile,
  fileExists: fileExists,
  readMetadataFile: readMetadataFile,
  createRequestedDirectory: createRequestedDirectory,
  archiveFile: archiveFile,
  getBaseFileCount: getBaseFileCount,
};

function createDirectoryWithMetadata(param: DirectoryParams): string {
  const { path, metadata } = param;
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
  fs.writeFileSync(`${path}/.metadata.json`, JSON.stringify(metadata), "utf-8");
  return path;
}

function readDirectoryMetadata(
  param: FileParams
): Array<{ metadata: DirectoryMetadata; project: string }> {
  const { path } = param;
  const projects = fs.readdirSync(path);
  let result = projects
    .filter((project) => !project.startsWith("."))
    .map((project) => {
      const metadata = readMetadataFile({ path: `${path}/${project}` });
      return { metadata, project };
    });
  return result;
}

function readMetadataFile(param: FileParams): DirectoryMetadata {
  const { path } = param;
  const metadata = fs.readFileSync(`${path}/.metadata.json`, "utf-8");
  return JSON.parse(metadata);
}

function createEmptyFile(param: FileParams): void {
  const { path } = param;
  fs.writeFileSync(path, "", "utf-8");
}

function createFileWithContent(param: ContentParams): void {
  const { path, content } = param;
  createDirectory(path.split("/").slice(0, -1).join("/"));
  fs.writeFileSync(path, content, "utf-8");
}

function createRequestedDirectory(param: FileParams): void {
  const { path } = param;
  console.log(path, "Create dir path");
  createDirectory(path);
}

function readFromFile(param: FileParams): string | undefined {
  const { path } = param;
  console.log("path: ", path);
  if (fs.existsSync(path)) {
    return fs.readFileSync(path, "utf-8");
  }
}

function writeFile(param: ContentParams): void {
  const { path, content } = param;
  fs.writeFileSync(path, content, "utf-8");
}

function archiveFile(param: FileParams): void {
  const { path } = param;
  if (fs.existsSync(path)) {
    try {
      const newPath = path.replace(".json", "-archived.json");
      fs.renameSync(path, newPath);
      console.log(`File renamed to: ${newPath}`);
    } catch (error) {
      console.error("Error renaming file:", error);
    }
  } else {
    console.error("File does not exist:", path);
  }
}

function getDirectoryList(
  param: DirectoryListParams
): Array<string | { name: string; children: string[] }> {
  const { path, constructTree, filterString } = param;

  const projects = fs.readdirSync(path);
  const folders = projects.filter(
    (project: string) =>
      !project.startsWith(".") &&
      fs.statSync(`${path}/${project}`).isDirectory()
  );

  const regex = new RegExp(`-${filterString}\.json$`, "i");

  const filterFiles = (fileName: string) => regex.test(fileName);

  if (constructTree) {
    return folders.map((folder: string) => {
      const files = fs.readdirSync(`${path}/${folder}`);
      return {
        name: folder,
        children: files.filter(
          (file) => !file.startsWith(".") && filterFiles(file)
        ),
      };
    });
  } else {
    const files = projects.filter(
      (project) =>
        !project.startsWith(".") &&
        filterFiles(project) &&
        fs.statSync(`${path}/${project}`).isFile()
    );
    return files;
  }
}

async function getBaseFileCount({ path }: FileParams): Promise<number> {
  const keyName = pathModule.basename(path);
  try {
    if (fs.existsSync(path)) {
      const files = await fsPromise.readdir(path);
      return files.filter(
        (file) => file.startsWith(keyName) && file.includes("-base")
      ).length;
    }
    return 0;
  } catch (err) {
    console.error("Error reading files in directory:", err);
    return 0;
  }
}

async function appendFile({
  path,
  content,
  featureFile,
  baseFileCount,
}: AppendFileParams): Promise<number | undefined> {
  const keyName = pathModule.basename(path);

  try {
    await fsPromise.mkdir(path, { recursive: true });
    console.log(
      path,
      content,
      featureFile,
      "Directory created or already exists."
    );
  } catch (err) {
    console.error("Error creating directory:", err);
    return;
  }

  try {
    if (baseFileCount === -1) {
      baseFileCount = await getBaseFileCount({ path });
    }

    const fileCount = baseFileCount;

    let newFileName =
      featureFile === ""
        ? `${keyName}${(fileCount + 1).toString().padStart(2, "0")}-base.json`
        : `${featureFile}-feature.json`;
    const newFilePath = pathModule.join(path, newFileName);

    await fsPromise.writeFile(newFilePath, content, "utf-8");

    if (path.includes("PRD") && featureFile === "") {
      const prdFileName = `${keyName}${(fileCount + 1)
        .toString()
        .padStart(2, "0")}-feature.json`;
      const prdFilePath = pathModule.join(path, prdFileName);
      await fsPromise.writeFile(
        prdFilePath,
        JSON.stringify({ features: [] }),
        "utf-8"
      );
    }
    return fileCount;
  } catch (err) {
    console.error("Error handling files:", err);
  }
}

function createDirectory(path: string): void {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }
}

function readFileChunk(
  param: FileChunkParams
): Promise<{
  requirement: string | null;
  title: string | null;
  message?: string;
}> {
  const { path, filterString } = param;
  const CHUNK_SIZE = 400;
  const buffer = Buffer.alloc(CHUNK_SIZE);
  let accumulatedData = "";
  let dataExtracted = { requirement: null, title: null, epicTicketId: null };
  const fileName = path.split("/").pop() || "";

  // Build regex based on the filter string
  const regex = new RegExp(`-${filterString}\.json$`, "i");

  return new Promise((resolve, reject) => {
    if (!regex.test(fileName)) {
      return resolve({
        requirement: null,
        title: null,
        message: "File name does not match the specified pattern.",
      });
    }

    fs.open(path, "r", (err, fd) => {
      if (err) return reject(err);

      const tryParse = () => {
        try {
          const parsed = JSON.parse(accumulatedData);
          if (parsed.requirement && !dataExtracted.requirement) {
            dataExtracted.requirement = parsed.requirement;
          }
          if (parsed.title && !dataExtracted.title) {
            dataExtracted.title = parsed.title;
          }
          if (parsed.epicTicketId && !dataExtracted.epicTicketId) {
            dataExtracted.epicTicketId = parsed.epicTicketId;
          }
          if (dataExtracted.requirement && dataExtracted.title) {
            fs.close(fd, () => {});
            resolve(dataExtracted);
          }
        } catch (parseError) {
          // Continue reading if not all data has been parsed
        }
      };

      const readNextChunk = () => {
        fs.read(fd, buffer, 0, CHUNK_SIZE, null, (err, nread) => {
          if (err) {
            fs.close(fd, () => {});
            return reject(err);
          }

          if (nread === 0) {
            fs.close(fd, (err) => {
              if (err) reject(err);
              if (!dataExtracted.requirement || !dataExtracted.title) {
                reject(
                  new Error(
                    "Could not find 'requirement' or 'title' field in the available data."
                  )
                );
              }
            });
            return;
          }

          const chunk = buffer.slice(0, nread).toString();
          accumulatedData += chunk;
          tryParse();

          if (!dataExtracted.requirement || !dataExtracted.title) {
            readNextChunk();
          }
        });
      };
      readNextChunk();
    });
  });
}

function fileExists(param: FileParams): boolean {
  const { path } = param;
  return fs.existsSync(path);
}

// module.exports.utilityFunctionMap = utilityFunctionMap;
