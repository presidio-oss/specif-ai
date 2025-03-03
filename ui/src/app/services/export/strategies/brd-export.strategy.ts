import { NGXLogger } from 'ngx-logger';
import { Clipboard } from '@angular/cdk/clipboard';
import { SpreadSheetService } from '../../spreadsheet.service';
import { BaseRequirementExportStrategy } from './base-requirement-export.strategy';
import { REQUIREMENT_TYPE } from 'src/app/constants/app.constants';

export class BRDExportStrategy extends BaseRequirementExportStrategy {
  constructor(
    exportService: SpreadSheetService,
    logger: NGXLogger,
    clipboard: Clipboard,
  ) {
    super(exportService, logger, clipboard, REQUIREMENT_TYPE.BRD);
  }
}
