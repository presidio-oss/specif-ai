import { NGXLogger } from 'ngx-logger';
import { IList } from 'src/app/model/interfaces/IList';
import {
  REQUIREMENT_DISPLAY_NAME_MAP,
  REQUIREMENT_TYPE,
  RequirementType,
} from '../../../constants/app.constants';
import {
  EXPORT_FILE_FORMATS,
  SPREADSHEET_HEADER_ROW,
} from '../../../constants/export.constants';
import { ClipboardService } from '../../clipboard.service';
import { SpreadSheetService } from '../../spreadsheet.service';
import { ExportOptions, ExportResult, ExportStrategy } from './export.strategy';

// types

type FormattedRequirementItem = {
  id: string;
  title: string;
  requirement: string;
};

type RequirementItemRowArr = [string, string, string];

// types

export abstract class BaseRequirementExportStrategy implements ExportStrategy {
  constructor(
    protected logger: NGXLogger,
    protected requirementType: RequirementType,
    protected exportService: SpreadSheetService,
    protected clipboardService: ClipboardService,
  ) {}

  protected prepareData(files: Array<IList>): Array<FormattedRequirementItem> {
    try {
      const data: FormattedRequirementItem[] = files.map((file) => ({
        id: file.fileName.split('-')[0],
        title: file.content.title!,
        requirement: file.content.requirement!,
      }));

      return data;
    } catch (error) {
      this.logger.error(
        `Error preparing ${this.requirementType} export data:`,
        error,
      );
      throw error;
    }
  }

  async export(
    data: Array<IList>,
    options: ExportOptions,
  ): Promise<ExportResult> {
    try {
      const { format, projectName } = options;
      const preparedData = this.prepareData(data);

      let success = true;

      switch (format) {
        case EXPORT_FILE_FORMATS.JSON: {
          success = this.clipboardService.copyToClipboard(preparedData);
          break;
        }
        case EXPORT_FILE_FORMATS.EXCEL: {
          const transformedData = this.transformData(preparedData);
          const fileName = `${projectName}_${REQUIREMENT_TYPE[this.requirementType].toLowerCase()}`;
          this.exportToExcel(transformedData, fileName);
          break;
        }
        default: {
          throw new Error(`Format ${format} not supported`);
        }
      }

      return { success: success };
    } catch (error) {
      this.logger.error(`${this.requirementType} export failed:`, error);
      return { success: false, error: error as Error };
    }
  }

  protected transformData(data: FormattedRequirementItem[]) {
    return data.map(
      (d) => [d.id, d.title, d.requirement] as RequirementItemRowArr,
    );
  }

  protected exportToExcel(
    data: Array<RequirementItemRowArr>,
    fileName: string,
  ) {
    this.exportService.exportToExcel(
      [
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[this.requirementType],
          data: [SPREADSHEET_HEADER_ROW[this.requirementType], ...data],
        },
      ],
      fileName,
    );
  }
}
