import { NGXLogger } from 'ngx-logger';
import { Clipboard } from '@angular/cdk/clipboard';
import {
  REQUIREMENT_TYPE,
  REQUIREMENT_DISPLAY_NAME_MAP,
  REQUIREMENT_TYPE_FOLDER_MAP,
  FILTER_STRINGS,
} from '../../../constants/app.constants';
import { EXPORT_FILE_FORMATS } from '../../../constants/export.constants';
import { SpreadSheetService } from '../../spreadsheet.service';
import { ExportStrategy, ExportOptions, ExportResult } from './export.strategy';
import { AppSystemService } from '../../app-system/app-system.service';
import { IUserStory } from 'src/app/model/interfaces/IUserStory';

// types

type PRDTask = {
  id: string;
  title: string;
  acceptance: string;
};

type PRDUserStory = {
  id: string;
  name: string;
  description: string;
  tasks: PRDTask[];
};

type PRDData = {
  id: string;
  title: string;
  requirement: string;
  features: PRDUserStory[];
};

type PRDExportData = {
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
    private clipboard: Clipboard,
  ) {}

  supports(requirementType: string): boolean {
    return requirementType === REQUIREMENT_TYPE.PRD;
  }

  async prepareData(prdFiles: any[], projectName: string): Promise<PRDData[]> {
    try {
      // Initialize PRDs with basic data
      const prds: PRDData[] = prdFiles.map((prdFile) => ({
        id: prdFile.fileName.split('-')[0],
        title: prdFile.content.title,
        requirement: prdFile.content.requirement,
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
            const userStoriesFormatted: PRDUserStory[] = userStories.map(
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

            return [prdId, userStoriesFormatted] as [string, PRDUserStory[]];
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

  async export(data: any[], options: ExportOptions): Promise<ExportResult> {
    try {
      const { format, projectName } = options;

      // First prepare the data
      const preparedData = await this.prepareData(data, projectName);

      if (format === EXPORT_FILE_FORMATS.JSON) {
        return this.exportToJSON(preparedData);
      }

      const transformedData = this.transformData(preparedData);
      const fileName = `${projectName}_${REQUIREMENT_TYPE.PRD.toLowerCase()}`;

      if (format === EXPORT_FILE_FORMATS.EXCEL) {
        await this.exportToExcel(transformedData, fileName);
      } else if (format === EXPORT_FILE_FORMATS.CSV) {
        await this.exportToCSV(transformedData, fileName);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('PRD export failed:', error);
      return { success: false, error: error as Error };
    }
  }

  private transformData(data: PRDData[]): PRDExportData {
    const prdRows: Array<[string, string, string]> = data.map((d) => [
      d.id,
      d.title,
      d.requirement,
    ]);

    const userStories: Array<[string, string, string, string]> = [];
    const tasks: Array<[string, string, string, string]> = [];

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

  private async exportToExcel(
    data: PRDExportData,
    fileName: string,
  ): Promise<void> {
    const { prdRows, userStories, tasks } = data;

    this.exportService.exportToExcel(
      [
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.PRD],
          data: [['Id', 'Title', 'Requirement'], ...prdRows],
        },
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.US],
          data: [['Id', 'Parent Id', 'Name', 'Description'], ...userStories],
        },
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.TASK],
          data: [['Id', 'Parent Id', 'Title', 'Acceptance Criteria'], ...tasks],
        },
      ],
      fileName,
    );
  }

  private async exportToCSV(
    data: PRDExportData,
    fileName: string,
  ): Promise<void> {
    const { prdRows, userStories, tasks } = data;
    const allRows = [
      ['Id', 'Type', 'Parent Id', 'Title', 'Description'],
      ...prdRows.map((row) => [row[0], 'PRD', '', row[1], row[2]]),
      ...userStories.map((row) => [
        row[0],
        'User Story',
        row[1],
        row[2],
        row[3],
      ]),
      ...tasks.map((row) => [row[0], 'Task', row[1], row[2], row[3]]),
    ];

    this.exportService.exportToCsv(allRows, fileName);
  }

  private async exportToJSON(data: PRDData[]): Promise<ExportResult> {
    try {
      this.clipboard.copy(JSON.stringify(data, null, 2));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }
}
