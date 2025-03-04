import { ClipboardService } from '../../clipboard.service';
import { NGXLogger } from 'ngx-logger';
import { REQUIREMENT_TYPE } from 'src/app/constants/app.constants';
import { SpreadSheetService } from '../../spreadsheet.service';
import { BaseRequirementExportStrategy } from './base-requirement-export.strategy';

export class BPExportStrategy extends BaseRequirementExportStrategy {
  constructor(
    exportService: SpreadSheetService,
    logger: NGXLogger,
    clipboardService: ClipboardService,
  ) {
    super(logger, REQUIREMENT_TYPE.BP, exportService, clipboardService);
  }
}
