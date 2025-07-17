import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { NGXLogger } from 'ngx-logger';
import { lastValueFrom } from 'rxjs';
import { UpdateMetadata } from '../../store/projects/projects.actions';
import { AppSystemService } from '../app-system/app-system.service';
import { ToasterService } from '../toaster/toaster.service';
import { joinPaths } from 'src/app/utils/path.utils';
import { REQUIREMENT_TYPE } from 'src/app/constants/app.constants';

@Injectable({
  providedIn: 'root'
})
export class JiraToPmoMigrationService {
  private readonly JIRA_FIELD_MAPPING = {
    'epicTicketId': 'pmoId',
    'storyTicketId': 'pmoId',
    'subTaskTicketId': 'pmoId'
  };

  constructor(
    private readonly store: Store,
    private readonly appSystemService: AppSystemService,
    private readonly toast: ToasterService,
    private readonly logger: NGXLogger
  ) {}

  /**
   * Checks if a project needs migration from JIRA to PMO references
   */
  shouldMigrateLegacyJira(appInfo: any): boolean {
    return !!(appInfo?.integration?.jira && !appInfo?.integration?.selectedPmoTool);
  }

  /**
   * Performs the complete migration from JIRA references to PMO references
   * This function orchestrates the migration process by Migrating all PRD files and Updating the project metadata to reflect the migration
   *
   * migrateLegacyJiraReferences()    // Main entry point
   * ├── migratePrdFiles()            // Process all files in PRD
   * │   └── migrateFile()            // Handle individual file
   * │       └── migrateObject()      // Migrate any data structure
   * │           ├── migrateArray()           // Handle arrays
   * │           └── migrateObjectFields()    // Handle objects
   * │               └── migrateLevelFields() // Migrate fields at current level
   */
  async migrateLegacyJiraReferences(solutionName: string, appInfo: any): Promise<void> {
    try {
      this.logger.debug('Starting JIRA to PMO reference migration for project:', solutionName);
      this.toast.showInfo('Migrating JIRA refs to generic PMO IDs (JIRA, ADO, etc.) for seamless compatibility across platforms.');

      const migratedFilesCount = await this.migratePrdFiles(solutionName);
      await this.updateProjectMetadata(appInfo);

      this.logger.info(`JIRA to PMO migration completed. Migrated ${migratedFilesCount} files.`);
      this.showCompletionMessage(migratedFilesCount);

    } catch (error) {
      this.logger.error('Error during JIRA to PMO migration:', error);
      this.toast.showError('Failed to migrate JIRA references. Please try again.');
      throw error;
    }
  }

  /**
   * Migrates all JSON files in the PRD directory
   */
  private async migratePrdFiles(solutionName: string): Promise<number> {
    try {
      const prdPath = joinPaths(solutionName, REQUIREMENT_TYPE.PRD);
      const prdBaseFiles = await this.appSystemService.getFolders(prdPath, 'base', false);
      const prdFeatureFiles = await this.appSystemService.getFolders(prdPath, 'feature', false);
      const prdFiles = [...prdBaseFiles, ...prdFeatureFiles];
      let migratedCount = 0;
      for (const filename of prdFiles) {
        if (filename?.endsWith('.json')) {
          const wasMigrated = await this.migrateFile(solutionName, filename);
          if (wasMigrated) migratedCount++;
        }
      }

      return migratedCount;
    } catch (error) {
      this.logger.error('Error accessing PRD directory:', error);
      this.toast.showWarning('No PRDs found. Migration completed without changes.');
      return 0;
    }
  }

  /**
   * Migrates a single JSON file by converting JIRA field references to PMO references
   */
  private async migrateFile(solutionName: string, fileName: string): Promise<boolean> {
    const filePath =  joinPaths(solutionName, REQUIREMENT_TYPE.PRD, fileName);

    try {
      this.logger.debug(`Processing file: ${filePath}`);

      const fileContent = await this.appSystemService.readFile(filePath);
      if (!fileContent?.trim()) {
        return false;
      }

      const parsedContent = JSON.parse(fileContent);
      const wasMigrated = this.migrateObject(parsedContent);

      if (wasMigrated) {
        await this.appSystemService.createFileWithContent(filePath, JSON.stringify(parsedContent, null, 2));
        this.logger.debug(`Successfully migrated file: ${fileName}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error migrating file ${fileName}:`, error);
      return false;
    }
  }

  /**
   * Migrates JIRA field references in any object or array structure
   * Returns true if any changes were made
   */
  private migrateObject(data: any): boolean {
    if (data === null || typeof data !== 'object') {
      return false;
    }

    if (Array.isArray(data)) {
      return this.migrateArray(data);
    }

    return this.migrateObjectFields(data);
  }

  /**
   * Migrates JIRA references in array items
   */
  private migrateArray(array: any[]): boolean {
    let hasChanges = false;

    for (const item of array) {
      if (this.migrateObject(item)) {
        hasChanges = true;
      }
    }

    return hasChanges;
  }

  /**
   * Migrates fields in an object and its nested properties
   */
  private migrateObjectFields(obj: any): boolean {
    let hasChanges = false;

    // First, migrate JIRA fields at this level
    hasChanges = this.migrateLevelFields(obj);

    // Then, recursively process all nested objects and arrays
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (this.migrateObject(obj[key])) {
          hasChanges = true;
        }
      }
    }

    return hasChanges;
  }

  /**
   * Migrates JIRA fields at the current object level
   */
  private migrateLevelFields(obj: any): boolean {
    let hasChanges = false;

    for (const [jiraField, pmoField] of Object.entries(this.JIRA_FIELD_MAPPING)) {
      if (obj.hasOwnProperty(jiraField)) {
        // Only migrate if the PMO field doesn't already exist
        if (!obj.hasOwnProperty(pmoField)) {
          obj[pmoField] = obj[jiraField];
          hasChanges = true;
        }
        delete obj[jiraField];
      }
    }

    return hasChanges;
  }

  /**
   * Updates project metadata to mark it as migrated
   */
  private async updateProjectMetadata(appInfo: any): Promise<void> {
    const updatedMetadata = {
      ...appInfo,
      integration: {
        ...appInfo.integration,
        selectedPmoTool: 'jira',
        jira: appInfo.integration?.jira || {}
      }
    };

    // Remove old JIRA key if it exists at root level
    delete updatedMetadata.jira;

    await lastValueFrom(this.store.dispatch(new UpdateMetadata(appInfo.id, updatedMetadata)));
  }

  /**
   * Shows completion message based on migration results
   */
  private showCompletionMessage(migratedFilesCount: number): void {
    if (migratedFilesCount > 0) {
      this.logger.info(`Successfully migrated ${migratedFilesCount} files from JIRA to PMO references.`);

      this.toast.showSuccess(
        `Migration successful! Reload the app to activate JIRA integration.`
      );
    } else {
      this.toast.showSuccess('Migration completed successfully. No JIRA references were found in the requirement files.');
    }
  }
}
