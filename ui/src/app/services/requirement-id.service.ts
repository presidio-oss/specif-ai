import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../store/projects/projects.state';
import { UpdateMetadata } from '../store/projects/projects.actions';
import {
  FILTER_STRINGS,
  FOLDER,
  REQUIREMENT_TYPE,
  REQUIREMENT_TYPE_FOLDER_MAP,
  RequirementType,
} from '../constants/app.constants';
import { IProjectMetadata } from '../model/interfaces/projects.interface';
import { AppSystemService } from './app-system/app-system.service';
import { NGXLogger } from 'ngx-logger';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RequirementIdService {
  constructor(
    private store: Store,
    private readonly appSystemService: AppSystemService,
    private readonly logger: NGXLogger,
  ) {}

  public getNextRequirementId(requirementType: RequirementType): number {
    const metadata = this.getMetadata();
    const currentId = metadata[requirementType]?.count ?? 0;
    const nextRequirementId = currentId + 1;

    return nextRequirementId;
  }

  public async updateRequirementCounters(
    requirementCounters: Partial<Record<RequirementType, number>>,
  ): Promise<void> {
    const metadata = this.getMetadata();
    const updates = Object.entries(requirementCounters).reduce(
      (acc, [type, count]) => ({
        ...acc,
        [type]: {
          ...metadata[type as RequirementType],
          count: count,
        },
      }),
      {},
    );

    await lastValueFrom(
      this.store.dispatch(
        new UpdateMetadata(metadata.id, {
          ...metadata,
          ...updates,
        }),
      ),
    );
  }

  private getMetadata(): IProjectMetadata {
    return this.store.selectSnapshot(ProjectsState.getMetadata);
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

      const countersToUpdate = Object.fromEntries(
        missingCounters.map((type) => [
          type,
          type === REQUIREMENT_TYPE.US ? storyIdCounter - 1 : taskIdCounter - 1,
        ]),
      );

      await this.updateRequirementCounters(countersToUpdate);
    }
  }

  public async syncRootRequirementCounters(projectName: string): Promise<void> {
    const missingCounters =
      await this.getMissingRootRequirementCounters(projectName);

    if (Object.keys(missingCounters).length) {
      await this.updateRequirementCounters(missingCounters);
    }
  }

  public isCounterMissing(type: RequirementType): boolean {
    const metadata = this.getMetadata();
    return !metadata[type] || metadata[type].count === undefined;
  }

  private async getMissingRootRequirementCounters(
    projectName: string,
  ): Promise<Partial<Record<RequirementType, number>>> {
    const metadata = this.getMetadata();
    const folders = Object.values(FOLDER).filter((folder) => {
      const data = metadata[folder as RequirementType];
      return !data || data.count === undefined;
    });

    if (!folders.length) return {};

    const entries = await Promise.all(
      folders.map(async (folder) => {
        const count = await this.appSystemService.getBaseFileCount(
          `${projectName}/${folder}`,
        );
        return [folder, count] as [RequirementType, number];
      }),
    );

    return Object.fromEntries(entries);
  }
}
