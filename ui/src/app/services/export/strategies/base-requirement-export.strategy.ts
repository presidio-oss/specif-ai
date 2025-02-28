import { Clipboard } from '@angular/cdk/clipboard';
import { NGXLogger } from 'ngx-logger';
import {
  REQUIREMENT_TYPE,
  REQUIREMENT_DISPLAY_NAME_MAP,
  RequirementType,
} from '../../../constants/app.constants';
import { EXPORT_FILE_FORMATS } from '../../../constants/export.constants';
import { SpreadSheetService } from '../../spreadsheet.service';
import { ExportOptions, ExportResult, ExportStrategy } from './export.strategy';

// types

type BaseRequirementData = {
  id: string;
  title: string;
  requirement: string;
};

// types

export abstract class BaseRequirementExportStrategy implements ExportStrategy {
  constructor(
    protected exportService: SpreadSheetService,
    protected logger: NGXLogger,
    protected clipboard: Clipboard,
    protected requirementType: RequirementType,
  ) {}

  supports(type: string): boolean {
    return type === this.requirementType;
  }

  async prepareData(files: any[]): Promise<Array<BaseRequirementData>> {
    try {
      const data: BaseRequirementData[] = files.map((file) => ({
        id: file.fileName.split('-')[0],
        title: file.content.title,
        requirement: file.content.requirement,
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

  async export(data: any[], options: ExportOptions): Promise<ExportResult> {
    try {
      const { format, projectName } = options;

      const preparedData = await this.prepareData(data);

      if (format === EXPORT_FILE_FORMATS.JSON) {
        const success = this.exportToJSON(preparedData);
        return {
          success: success,
        };
      }

      const transformedData = this.transformData(preparedData);
      const fileName = `${projectName}_${REQUIREMENT_TYPE[this.requirementType].toLowerCase()}`;

      if (format === EXPORT_FILE_FORMATS.EXCEL) {
        await this.exportToExcel(transformedData, fileName);
      } else {
        throw new Error(`Format ${format} not supported`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`${this.requirementType} export failed:`, error);
      return { success: false, error: error as Error };
    }
  }

  protected transformData(
    data: BaseRequirementData[],
  ): Array<[string, string, string]> {
    return data.map((d) => [d.id, d.title, d.requirement]);
  }

  protected async exportToExcel(
    data: Array<[string, string, string]>,
    fileName: string,
  ): Promise<void> {
    this.exportService.exportToExcel(
      [
        {
          name: REQUIREMENT_DISPLAY_NAME_MAP[this.requirementType],
          data: [['Id', 'Title', 'Requirement'], ...data],
        },
      ],
      fileName,
    );
  }

  protected exportToJSON(data: any) {
    const success = this.clipboard.copy(JSON.stringify(data, null, 2));
    return success;
  }
}
