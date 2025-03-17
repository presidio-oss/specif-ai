import { NGXLogger } from 'ngx-logger';
import {
  REQUIREMENT_DISPLAY_NAME_MAP,
  REQUIREMENT_TYPE,
} from 'src/app/constants/app.constants';
import {
  EXPORT_FILE_FORMATS,
  SPREADSHEET_HEADER_ROW,
} from 'src/app/constants/export.constants';
import { IUserStory } from 'src/app/model/interfaces/IUserStory';
import { ClipboardService } from '../../clipboard.service';
import { SpreadSheetService } from '../../spreadsheet.service';
import { ExportOptions, ExportResult, ExportStrategy } from './export.strategy';

// types

type ExportInputData = {
  prdId: string;
  userStories: Array<IUserStory>;
};

type FormattedStory = {
  id: string;
  name: string;
  description: string;
  tasks: {
    id: string;
    title: string;
    acceptance: string;
  }[];
};

type StoriesExportData = {
  userStoryRows: Array<[string, string, string, string]>;
  taskRows: Array<[string, string, string, string]>;
};

// types

export class UserStoriesExportStrategy implements ExportStrategy {
  constructor(
    private exportService: SpreadSheetService,
    private logger: NGXLogger,
    private clipboardService: ClipboardService,
  ) {}

  private prepareData(
    data: ExportInputData,
    projectName: string,
  ): Array<FormattedStory> {
    try {
      const userStories: Array<IUserStory> = data.userStories || [];

      const userStoriesFormatted = userStories.map((userStory) => {
        const storyId = `${data.prdId}-${userStory.id}`;
        const tasks =
          userStory.tasks?.map((task) => {
            const taskId = `${storyId}-${task.id}`;
            return {
              id: taskId,
              title: task.list,
              acceptance: task.acceptance,
            };
          }) ?? [];

        return {
          id: storyId,
          name: userStory.name,
          description: userStory.description,
          tasks: tasks,
        };
      });

      return userStoriesFormatted;
    } catch (error) {
      this.logger.error('Error preparing PRD export data:', error);
      throw error;
    }
  }

  async export(
    data: ExportInputData,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const { projectName, format: exportFormat } = options;

    const preparedData = this.prepareData(data, options.projectName);

    let success = true;

    switch (exportFormat) {
      case EXPORT_FILE_FORMATS.JSON: {
        success = this.clipboardService.copyToClipboard(preparedData);
        break;
      }
      case EXPORT_FILE_FORMATS.EXCEL: {
        const transformedData = this.transformData(data.prdId, preparedData);
        const fileName = `${projectName}_${REQUIREMENT_TYPE.US.toLowerCase()}`;
        this.exportToExcel(transformedData, fileName);
        break;
      }
      default: {
        throw new Error(`Format ${exportFormat} not supported`);
      }
    }

    return { success: success };
  }

  private transformData(
    prdId: string,
    formattedUserStories: FormattedStory[],
  ): StoriesExportData {
    const userStoryRows: StoriesExportData["userStoryRows"] = formattedUserStories.map(
      (story) => [story.id, prdId, story.name, story.description],
    );

    const taskRows: StoriesExportData["taskRows"] = [];

    formattedUserStories.forEach((story) => {
      story.tasks?.forEach((task) => {
        taskRows.push([task.id, story.id, task.title, task.acceptance]);
      });
    });

    return { userStoryRows, taskRows };
  }

  private exportToExcel(data: StoriesExportData, fileName: string) {
    const { userStoryRows, taskRows } = data;

    this.exportService.exportToExcel(
      [
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.US],
          data: [SPREADSHEET_HEADER_ROW.US, ...userStoryRows],
        },
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[REQUIREMENT_TYPE.TASK],
          data: [SPREADSHEET_HEADER_ROW.TASK, ...taskRows],
        },
      ],
      fileName,
    );
  }
}
