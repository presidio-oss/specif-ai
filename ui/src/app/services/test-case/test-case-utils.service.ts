import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { NGXLogger } from 'ngx-logger';
import { firstValueFrom } from 'rxjs';
import { AppSystemService } from '../app-system/app-system.service';
import { ArchiveFile } from '../../store/projects/projects.actions';
import { FILTER_STRINGS, REQUIREMENT_TYPE } from '../../constants/app.constants';
import { joinPaths } from '../../utils/path.utils';

// FIXME: This approach is inefficient for large projects with many test cases. 
// We need to consider a more efficient way to handle test cases, such as using a database or indexed storage.
@Injectable({ providedIn: 'root' })
export class TestCaseUtilsService {
  private store = inject(Store);
  private logger = inject(NGXLogger);
  private appSystemService = inject(AppSystemService);

  private getTestCasePath(projectPath: string, userStoryId: string): string {
    return joinPaths(projectPath, REQUIREMENT_TYPE.TC, userStoryId);
  }

  private async getBaseFiles(testCasePath: string): Promise<string[]> {
    return await this.appSystemService.getFolders(testCasePath, FILTER_STRINGS.BASE, false);
  }

  async checkForLinkedTestCases(projectPath: string, userStoryId: string): Promise<boolean> {
    try {
      const testCasePath = this.getTestCasePath(projectPath, userStoryId);
      const exists = await this.appSystemService.fileExists(testCasePath);
      if (!exists) return false;

      const files = await this.getBaseFiles(testCasePath);
      return files.length > 0;
    } catch (error) {
      this.logger.error(`Error checking for test cases for user story ${userStoryId}:`, error);
      return false;
    }
  }

  async deleteTestCasesForUserStory(projectPath: string, userStoryId: string): Promise<void> {
    const testCasePath = this.getTestCasePath(projectPath, userStoryId);
    try {
      if (!(await this.appSystemService.fileExists(testCasePath))) return;

      const files = await this.getBaseFiles(testCasePath);
      if (files.length === 0) return;

      for (const fileName of files) {
        const filePath = joinPaths(REQUIREMENT_TYPE.TC, userStoryId, fileName);
        await firstValueFrom(this.store.dispatch(new ArchiveFile(filePath)));
        this.logger.debug(`Archived test case file: ${fileName}`);
      }

      this.logger.debug(`Archived ${files.length} test case(s) for user story ${userStoryId}`);
    } catch (error) {
      this.logger.error(`Error deleting test cases for user story ${userStoryId}:`, error);
    }
  }

  async deleteTestCasesForUserStories(projectPath: string, userStoryIds: string[]): Promise<void> {
    if (!userStoryIds?.length) return;

    this.logger.debug(`Deleting test cases for ${userStoryIds.length} user stories`);
    for (const userStoryId of userStoryIds) {
      await this.deleteTestCasesForUserStory(projectPath, userStoryId);
    }
  }

  async getTestCasesForUserStory(projectPath: string, userStoryId: string): Promise<any[]> {
    const testCasePath = this.getTestCasePath(projectPath, userStoryId);
    try {
      if (!(await this.appSystemService.fileExists(testCasePath))) return [];

      const files = await this.getBaseFiles(testCasePath);
      if (!files.length) return [];

      const testCases = await Promise.all(
        files.map(async (fileName) => {
          const fullPath = joinPaths(testCasePath, fileName);
          try {
            const content = await this.appSystemService.readFile(fullPath);
            return JSON.parse(content);
          } catch (error) {
            this.logger.error(`Failed to parse ${fileName}:`, error);
            return null;
          }
        })
      );

      return testCases.filter(Boolean);
    } catch (error) {
      this.logger.error(`Error loading test cases for user story ${userStoryId}:`, error);
      return [];
    }
  }
}
