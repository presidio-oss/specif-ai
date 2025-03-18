import { NGXLogger } from 'ngx-logger';
import { ClipboardService } from '../../clipboard.service';
import { SpreadSheetService } from '../../spreadsheet.service';
import { BaseRequirementExportStrategy } from './base-requirement-export.strategy';
import { REQUIREMENT_TYPE } from 'src/app/constants/app.constants';

export class UIRExportStrategy extends BaseRequirementExportStrategy {
  constructor(
    exportService: SpreadSheetService,
    logger: NGXLogger,
    clipboardService: ClipboardService,
  ) {
    super(logger, REQUIREMENT_TYPE.UIR, exportService, clipboardService);
  }
}
