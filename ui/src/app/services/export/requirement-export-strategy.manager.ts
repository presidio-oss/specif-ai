import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { REQUIREMENT_TYPE } from 'src/app/constants/app.constants';
import { SpreadSheetService } from '../spreadsheet.service';
import { BPExportStrategy } from './strategies/bp-export.strategy';
import { BRDExportStrategy } from './strategies/brd-export.strategy';
import { ExportStrategy } from './strategies/export.strategy';
import { NFRExportStrategy } from './strategies/nfr-export.strategy';
import { PRDExportStrategy } from './strategies/prd-export.strategy';
import { UIRExportStrategy } from './strategies/uir-export.strategy';
import { AppSystemService } from '../app-system/app-system.service';
import { ClipboardService } from '../clipboard.service';
import { UserStoriesExportStrategy } from './strategies/user-stories-export.strategy';

@Injectable({
  providedIn: 'root',
})
export class RequirementExportStrategyManager {
  private strategies = new Map<string, ExportStrategy>();

  constructor(
    private logger: NGXLogger,
    private exportService: SpreadSheetService,
    private appSystemService: AppSystemService,
    private clipboardService: ClipboardService,
  ) {}

  initializeStrategy(requirementType: string) {
    switch (requirementType) {
      case REQUIREMENT_TYPE.PRD: {
        return new PRDExportStrategy(
          this.exportService,
          this.appSystemService,
          this.logger,
          this.clipboardService,
        );
      }
      case REQUIREMENT_TYPE.BRD: {
        return new BRDExportStrategy(
          this.exportService,
          this.logger,
          this.clipboardService,
        );
      }
      case REQUIREMENT_TYPE.BP: {
        return new BPExportStrategy(
          this.exportService,
          this.logger,
          this.clipboardService,
        );
      }
      case REQUIREMENT_TYPE.NFR: {
        return new NFRExportStrategy(
          this.exportService,
          this.logger,
          this.clipboardService,
        );
      }
      case REQUIREMENT_TYPE.UIR: {
        return new UIRExportStrategy(
          this.exportService,
          this.logger,
          this.clipboardService,
        );
      }
      case REQUIREMENT_TYPE.US: {
        return new UserStoriesExportStrategy(
          this.exportService,
          this.logger,
          this.clipboardService,
        );
      }
      default: {
        throw new Error(`Export is not supported for ${requirementType}`);
      }
    }
  }

  getStrategy(requirementType: string): ExportStrategy {
    try {
      let strategy = this.strategies.get(requirementType);
      if (!strategy) {
        strategy = this.initializeStrategy(requirementType);
        this.strategies.set(requirementType, strategy);
      }
      return strategy;
    } catch (error) {
      this.logger.error(`Failed to get strategy for ${requirementType}`, error);
      throw error;
    }
  }

  clearStrategies(): void {
    this.strategies.clear();
  }
}
