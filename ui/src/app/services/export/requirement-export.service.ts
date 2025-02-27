import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ToasterService } from '../toaster/toaster.service';
import { RequirementExportStrategyManager } from './requirement-export-strategy.manager';
import { ExportRequirementDataOptions } from 'src/app/model/interfaces/exports.interface';

@Injectable({
  providedIn: 'root',
})
export class RequirementExportService {
  constructor(
    private strategyManager: RequirementExportStrategyManager,
    private logger: NGXLogger,
    private toast: ToasterService,
  ) {}

  public async exportRequirementData(
    files: any[],
    options: ExportRequirementDataOptions & { projectName: string },
    requirementType: string,
  ): Promise<void> {
    try {
      const strategy = this.strategyManager.getStrategy(requirementType);

      const result = await strategy.export(files, {
        format: options.type,
        projectName: options.projectName,
      });

      if (!result.success && result.error) {
        throw result.error;
      }
    } catch (error) {
      this.logger.error('Export failed:', error);
      this.toast.showError(
        `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
