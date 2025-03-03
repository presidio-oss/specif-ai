import { NGXLogger } from 'ngx-logger';
import { IUserStory } from 'src/app/model/interfaces/IUserStory';
import {
  FILTER_STRINGS,
  REQUIREMENT_DISPLAY_NAME_MAP,
  REQUIREMENT_TYPE,
  REQUIREMENT_TYPE_FOLDER_MAP,
} from '../../../constants/app.constants';
import { EXPORT_FILE_FORMATS, SPREADSHEET_HEADER_ROW } from '../../../constants/export.constants';
import { AppSystemService } from '../../app-system/app-system.service';
import { ClipboardService } from '../../clipboard.service';
import { SpreadSheetService } from '../../spreadsheet.service';
import { ExportOptions, ExportResult, ExportStrategy } from './export.strategy';
import { IList } from 'src/app/model/interfaces/IList';

// types

type FormattedTask = {
  id: string;
  title: string;
  acceptance: string;
};

type FormattedUserStory = {
  id: string;
  name: string;
  description: string;
  tasks: FormattedTask[];
};

type FormattedPRD = {
  id: string;
  title: string;
  requirement: string;
  features: FormattedUserStory[];
};

type PRDExportRows = {
  prdRows: Array<[string, string, string]>;
  userStories: Array<[string, string, string, string]>;
  tasks: Array<[string, string, string, string]>;
};

// types

export class PRDExportStrategy implements ExportStrategy {
  constructor(
    private exportService: SpreadSheetService,
    private appSystemService: AppSystemService,
    private logger: NGXLogger,
    private clipboardService: ClipboardService,
  ) {}

  supports(requirementType: string): boolean {
    return requirementType === REQUIREMENT_TYPE.PRD;
  }

  async prepareData(prdFiles: IList[], projectName: string): Promise<FormattedPRD[]> {
    try {
      const prds: FormattedPRD[] = prdFiles.map((prdFile) => ({
        id: prdFile.fileName.split('-')[0],
        title: prdFile.content.title!,
        requirement: prdFile.content.requirement!,
        features: [],
      }));

      // Get feature files
      const folders = await this.appSystemService.getFolders(
        projectName,
        FILTER_STRINGS.FEATURE,
      );

      const prdFolder = folders.find(
        (folder: any) =>
          folder.name === REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD],
      );

      if (!prdFolder?.children?.length) {
        this.logger.debug('No PRD features found');
        return prds;
      }

      // Process features
      const featuresResponse = await Promise.all(
        prdFolder.children.map(async (path: string) => {
          try {
            const filePath = `${projectName}/${REQUIREMENT_TYPE_FOLDER_MAP[REQUIREMENT_TYPE.PRD]}/${path}`;
            const res = await this.appSystemService.readFile(filePath);
            const prdId = path.split('-')[0];

            const userStories: Array<IUserStory> =
              JSON.parse(res).features || [];
            const userStoriesFormatted: FormattedUserStory[] = userStories.map(
              (userStory) => {
                const storyId = `${prdId}-${userStory.id}`;
                return {
                  id: storyId,
                  name: userStory.name,
                  description: userStory.description,
                  tasks:
                    userStory.tasks?.map((task) => {
                      const taskId = `${storyId}-${task.id}`;
                      return {
                        id: taskId,
                        title: task.list,
                        acceptance: task.acceptance,
                      };
                    }) ?? [],
                };
              },
            );

            return [prdId, userStoriesFormatted] as [string, FormattedUserStory[]];
          } catch (error) {
            this.logger.error('Error processing feature file:', {
              path,
              error,
            });
            return null;
          }
        }),
      );

      // Associate features with PRDs
      featuresResponse.forEach((item) => {
        if (!item) return;
        const [id, features] = item;
        const prd = prds.find((p) => p.id === id);
        if (prd) {
          prd.features = features;
        }
      });

      return prds;
    } catch (error) {
      this.logger.error('Error preparing PRD export data:', error);
      throw error;
    }
  }

  async export(data: IList[], options: ExportOptions): Promise<ExportResult> {
    try {
      const { format: exportFormat, projectName } = options;

      const preparedData = await this.prepareData(data, projectName);

      let success = true;

      switch (exportFormat) {
        case EXPORT_FILE_FORMATS.JSON: {
          success = this.clipboardService.copyToClipboard(preparedData);
          break;
        }
        case EXPORT_FILE_FORMATS.EXCEL: {
          const transformedData = this.transformData(preparedData);
          const fileName = `${projectName}_${REQUIREMENT_TYPE.PRD.toLowerCase()}`;
          this.exportToExcel(transformedData, fileName);
          break;
        }
        default: {
          throw new Error(`Format ${exportFormat} not supported`);
        }
      }
  
      return { success: success };
    } catch (error) {
      this.logger.error('PRD export failed:', error);
      return { success: false, error: error as Error };
    }
  }

  private transformData(data: FormattedPRD[]): PRDExportRows {
    const prdRows: PRDExportRows["prdRows"] = data.map((d) => [
      d.id,
      d.title,
      d.requirement,
    ]);

    const userStories: PRDExportRows["userStories"] = [];
    const tasks: PRDExportRows["tasks"] = [];

    data.forEach((prd) => {
      prd.features?.forEach((story) => {
        userStories.push([story.id, prd.id, story.name, story.description]);

        story.tasks?.forEach((task) => {
          tasks.push([task.id, story.id, task.title, task.acceptance]);
        });
      });
    });

    return { prdRows, userStories, tasks };
  }

  private exportToExcel(data: PRDExportRows, fileName: string) {
    const { prdRows, userStories, tasks } = data;

    this.exportService.exportToExcel(
      [
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.PRD],
          data: [SPREADSHEET_HEADER_ROW.PRD, ...prdRows],
        },
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.US],
          data: [SPREADSHEET_HEADER_ROW.US, ...userStories],
        },
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.TASK],
          data: [SPREADSHEET_HEADER_ROW.TASK, ...tasks],
        },
      ],
      fileName,
    );
  }
}
