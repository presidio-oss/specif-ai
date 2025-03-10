import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../store/projects/projects.state';
import { UpdateMetadata } from '../store/projects/projects.actions';
import {
  FILTER_STRINGS,
  REQUIREMENT_TYPE,
  REQUIREMENT_TYPE_FOLDER_MAP,
  RequirementType,
} from '../constants/app.constants';
import { IProjectMetadata } from '../model/interfaces/projects.interface';
import { AppSystemService } from './app-system/app-system.service';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class RequirementIdService {
  constructor(
    private store: Store,
    private readonly appSystemService: AppSystemService,
    private readonly logger: NGXLogger,
  ) {}

  public getNextRequirementId(
    requirementType: RequirementType,
    autoIncrement = false,
  ): number {
    const metadata = this.getMetadata();

    const currentId = metadata.requirementsIdCounter[requirementType] ?? 0;
    const nextRequirementId = currentId + 1;

    if (autoIncrement) {
      this.updateRequirementCounters({ [requirementType]: nextRequirementId });
    }

    return nextRequirementId;
  }

  public updateRequirementCounters(
    requirementCounters: Partial<Record<RequirementType, number>>,
  ): void {
    const metadata = this.getMetadata();

    this.store.dispatch(
      new UpdateMetadata(metadata.id, {
        ...metadata,
        requirementsIdCounter: {
          ...metadata.requirementsIdCounter,
          ...requirementCounters,
        },
      }),
    );
  }

  private getMetadata(): IProjectMetadata {
    const metadata = this.store.selectSnapshot(ProjectsState.getMetadata);
    return {
      ...metadata,
      requirementsIdCounter: metadata.requirementsIdCounter || {},
    };
  }

  public async updateFeatureAndTaskIds(
    projectName: string,
    idTypes: RequirementType[],
  ): Promise<{ storyIdCounter: number; taskIdCounter: number }> {
    try {
      const prdFeatureFolder = await this.getPrdFeatureFolder(projectName);
      if (!prdFeatureFolder?.children?.length) {
        throw new Error(`No PRD files found for project: ${projectName}`);
      }

      const prdFolderPath = `${projectName}/${REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD]}`;
      let storyIdCounter = 1;
      let taskIdCounter = 1;

      // First pass: update IDs for stories or tasks
      const fileContents = await Promise.all(
        prdFeatureFolder.children.map(async (fileName) => {
          const filePath = `${prdFolderPath}/${fileName}`;
          try {
            const fileContent = await this.appSystemService.readFile(filePath);
            const parsedContent = JSON.parse(fileContent);

            if (parsedContent.features?.length) {
              parsedContent.features.forEach((story: any) => {
                if (idTypes.includes(REQUIREMENT_TYPE.US)) {
                  story.id = `US${storyIdCounter++}`;
                }
                if (
                  idTypes.includes(REQUIREMENT_TYPE.TASK) &&
                  story.tasks?.length
                ) {
                  story.tasks.forEach((task: any) => {
                    task.id = `TASK${taskIdCounter++}`;
                  });
                }
              });

              return { filePath, content: parsedContent };
            }
          } catch (error) {
            this.logger.error(
              `Failed to read or process file ${fileName} for project: ${projectName}`,
              error,
            );
          }
          return null;
        }),
      );

      // Second pass: write updated files
      const validFileContents = fileContents.filter(
        (item): item is { filePath: string; content: any } => item !== null,
      );
      await Promise.all(
        validFileContents.map(async ({ filePath, content }) => {
          try {
            await this.appSystemService.createFileWithContent(
              filePath,
              JSON.stringify(content),
            );
          } catch (error) {
            this.logger.error(
              `Failed to write file ${filePath} for project: ${projectName}`,
              error,
            );
          }
        }),
      );

      return { storyIdCounter, taskIdCounter };
    } catch (error) {
      this.logger.error(
        `Failed to update IDs for project: ${projectName}`,
        error,
      );
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

  public async syncStoryAndTaskCounters(): Promise<void> {
    const project = this.store.selectSnapshot(ProjectsState.getSelectedProject);

    const missingCounters = [
      this.isCounterMissing(REQUIREMENT_TYPE.US) && REQUIREMENT_TYPE.US,
      this.isCounterMissing(REQUIREMENT_TYPE.TASK) && REQUIREMENT_TYPE.TASK,
    ].filter(Boolean) as RequirementType[];

    if (missingCounters.length > 0) {
      const { storyIdCounter, taskIdCounter } =
        await this.updateFeatureAndTaskIds(project, missingCounters);

      this.updateRequirementCounters({
        [REQUIREMENT_TYPE.US]: storyIdCounter - 1,
        [REQUIREMENT_TYPE.TASK]: taskIdCounter - 1,
      });
    }
  }

  private isCounterMissing(type: RequirementType): boolean {
    const metadata = this.store.selectSnapshot(ProjectsState.getMetadata);
    const { requirementsIdCounter = {} } = metadata;
    return requirementsIdCounter[type] === undefined;
  }
}
