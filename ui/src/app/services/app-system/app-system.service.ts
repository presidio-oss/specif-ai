import { inject, Injectable } from '@angular/core';
import { APP_CONSTANTS } from '../../constants/app.constants';
import { ElectronService } from '../../electron-bridge/electron.service';
import { NGXLogger } from 'ngx-logger';
import { IProject } from '../../model/interfaces/projects.interface';

@Injectable({
  providedIn: 'root',
})
export class AppSystemService {
  electronService = inject(ElectronService);
  logger = inject(NGXLogger);

  async getProjectList(): Promise<Array<IProject>> {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    return this.electronService.invokeFunction('readDirectoryMetadata', {
      path: directory,
    });
  }

  async createProject(metadata: any, projectName: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    await this.electronService.invokeFunction('createDirectoryWithMetadata', {
      metadata,
      path: `${directory}/${projectName}`,
    });
  }

  async createEmptyFile(relativePathWithFileName: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    await this.electronService.invokeFunction('createEmptyFile', {
      path: `${directory}/${relativePathWithFileName}`,
    });
  }

  async createFileWithContent(relativePathWithFileName: string, content: any) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    await this.electronService.invokeFunction('createFileWithContent', {
      content,
      path: `${directory}/${relativePathWithFileName}`,
    });
  }

  async createDirectory(relativePath: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    await this.electronService.invokeFunction('createRequestedDirectory', {
      path: `${directory}/${relativePath}`,
    });
  }

  async archiveFile(relativePath: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    await this.electronService.invokeFunction('archiveFile', {
      path: `${directory}/${relativePath}`,
    });
  }

  async getBaseFileCount(relativePath: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    return await this.electronService.invokeFunction('getBaseFileCount', {
      path: `${directory}/${relativePath}`,
    });
  }

  async createNewFile(
    relativePathWithFileName: string,
    content: any,
    featureFile: string,
    baseFileCount: number,
    customPrefix?: string,
  ): Promise<number> {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    return await this.electronService.invokeFunction('appendFile', {
      content,
      path: `${directory}/${relativePathWithFileName}`,
      featureFile,
      baseFileCount,
      customPrefix,
    });
  }

  async getFolders(relativePath: string, filterString: string, constructTree: boolean = true) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    return this.electronService.invokeFunction('getDirectoryList', {
      path: `${directory}/${relativePath}`,
      constructTree,
      filterString,
    });
  }

  async readFile(relativePath: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    return this.electronService.invokeFunction('readFromFile', {
      path: `${directory}/${relativePath}`,
    });
  }

  async readPortionOfFile(relativePath: string, filterString: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    return this.electronService.invokeFunction('readFileChunk', {
      path: `${directory}/${relativePath}`,
      filterString,
    });
  }

  async fileExists(relativePath: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    return this.electronService.invokeFunction('fileExists', {
      path: `${directory}/${relativePath}`,
    });
  }

  async readMetadata(path: string) {
    const directory = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    return this.electronService.invokeFunction('readMetadataFile', {
      path: `${directory}/${path}`,
    });
  }
}
