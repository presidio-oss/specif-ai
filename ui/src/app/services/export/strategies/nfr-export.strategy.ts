import { Clipboard } from '@angular/cdk/clipboard';
import { NGXLogger } from 'ngx-logger';
import { REQUIREMENT_TYPE } from 'src/app/constants/app.constants';
import { SpreadSheetService } from '../../spreadsheet.service';
import { BaseRequirementExportStrategy } from './base-requirement-export.strategy';

export class NFRExportStrategy extends BaseRequirementExportStrategy {
  constructor(
    exportService: SpreadSheetService,
    logger: NGXLogger,
    clipboard: Clipboard,
  ) {
    super(exportService, logger, clipboard, REQUIREMENT_TYPE.NFR);
  }
}
