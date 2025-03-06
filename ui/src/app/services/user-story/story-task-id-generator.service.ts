import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { AppSystemService } from '../app-system/app-system.service';
import {
  FILTER_STRINGS,
  REQUIREMENT_TYPE_FOLDER_MAP,
  REQUIREMENT_TYPE,
} from '../../constants/app.constants';
import { IUserStory } from '../../model/interfaces/IUserStory';

@Injectable({
  providedIn: 'root',
})
export class StoryTaskIdGeneratorService {
  constructor(
    private readonly appSystemService: AppSystemService,
    private readonly logger: NGXLogger,
  ) {}

  async getNextStoryId(projectName: string): Promise<number> {
    return this.getNextId(projectName, REQUIREMENT_TYPE.US);
  }

  async getNextTaskId(projectName: string): Promise<number> {
    return this.getNextId(projectName, REQUIREMENT_TYPE.TASK);
  }

  private async getNextId(
    projectName: string,
    idType: (typeof REQUIREMENT_TYPE)[keyof typeof REQUIREMENT_TYPE],
  ): Promise<number> {
    try {
      const prdFeatureFolder = await this.getPrdFeatureFolder(projectName);
      if (!prdFeatureFolder?.children?.length) {
        return 1;
      }

      let maxId = 0;

      for (const featureFileName of prdFeatureFolder.children) {
        const { storyId, taskId } = await this.processFeatureFile(
          projectName,
          featureFileName,
          idType,
        );
        maxId =
          idType === REQUIREMENT_TYPE.US
            ? Math.max(maxId, storyId)
            : Math.max(maxId, taskId);
      }

      return maxId + 1;
    } catch (error) {
      this.logger.error(`Error getting last ${idType} ID:`, {
        projectName,
        error,
      });
      throw error;
    }
  }

  private async getPrdFeatureFolder(
    projectName: string,
  ): Promise<{ name: string; children?: string[] } | undefined> {
    const projectFolders = await this.appSystemService.getFolders(
      projectName,
      FILTER_STRINGS.FEATURE,
    );

    return projectFolders.find(
      (folder: { name: string; children?: string[] }) =>
        folder.name === REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD],
    );
  }

  private async processFeatureFile(
    projectName: string,
    featureFileName: string,
    idType: (typeof REQUIREMENT_TYPE)[keyof typeof REQUIREMENT_TYPE],
  ): Promise<{ storyId: number; taskId: number }> {
    try {
      const featureFilePath = `${projectName}/${REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD]}/${featureFileName}`;
      const fileContent = await this.appSystemService.readFile(featureFilePath);
      const userStories: IUserStory[] = JSON.parse(fileContent).features || [];

      let maxStoryId = 0;
      let maxTaskId = 0;

      userStories.forEach((userStory) => {
        if (idType === REQUIREMENT_TYPE.US) {
          const storyId = this.extractId(userStory.id, 'US');
          maxStoryId = Math.max(maxStoryId, storyId);
        }

        if (idType === REQUIREMENT_TYPE.TASK) {
          (userStory.tasks || []).forEach((task) => {
            const taskId = this.extractId(task.id, 'TASK');
            maxTaskId = Math.max(maxTaskId, taskId);
          });
        }
      });

      return { storyId: maxStoryId, taskId: maxTaskId };
    } catch (error) {
      this.logger.error('Error processing feature file:', {
        featureFileName,
        error,
      });
      return { storyId: 0, taskId: 0 };
    }
  }

  private extractId(id: string, prefix: string): number {
    return parseInt(id.replace(prefix, '')) || 0;
  }

  async updateFeatureAndTaskIds(
    projectName: string,
    idType?: (typeof REQUIREMENT_TYPE)[keyof typeof REQUIREMENT_TYPE],
  ): Promise<void> {
    try {
      const prdFeatureFolder = await this.getPrdFeatureFolder(projectName);
      if (!prdFeatureFolder?.children?.length) {
        throw new Error(`No PRD files found for project: ${projectName}`);
      }

      // First pass: read all files in parallel
      const fileContents: Record<string, any> = {};
      const prdFolderPath = `${projectName}/${REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD]}`;

      await Promise.all(
        prdFeatureFolder.children.map(async (fileName) => {
          const filePath = `${prdFolderPath}/${fileName}`;

          try {
            const fileContent = await this.appSystemService.readFile(filePath);
            const parsedContent = JSON.parse(fileContent);

            if (parsedContent.features?.length) {
              fileContents[filePath] = parsedContent;
            }
          } catch (error) {
            this.logger.error(
              `Failed to read file ${fileName} for project: ${projectName}`,
              error,
            );
          }
        }),
      );

      // Second pass: assign IDs sequentially
      let storyIdCounter = 1;
      let taskIdCounter = 1;

      for (const filePath of Object.keys(fileContents)) {
        const parsedContent = fileContents[filePath];

        for (const story of parsedContent.features) {
          if (!idType || idType === REQUIREMENT_TYPE.US) {
            story.id = `US${storyIdCounter++}`;
          }

          if (
            (!idType || idType === REQUIREMENT_TYPE.TASK) &&
            story.tasks?.length
          ) {
            for (const task of story.tasks) {
              task.id = `TASK${taskIdCounter++}`;
            }
          }
        }
      }

      // Third pass: write all files in parallel
      await Promise.all(
        Object.keys(fileContents).map(async (filePath) => {
          await this.appSystemService.writeFile(
            filePath,
            JSON.stringify(fileContents[filePath]),
          );
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to update IDs for project: ${projectName}`,
        error,
      );
      throw error;
    }
  }
}
