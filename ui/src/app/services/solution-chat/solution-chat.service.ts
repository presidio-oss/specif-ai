import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { firstValueFrom } from 'rxjs';
import { joinPaths } from 'src/app/utils/path.utils';
import { NGXLogger } from 'ngx-logger';

const SOLUTION_CHAT_FILE_NAME = 'solution_chat.json';

@Injectable({
  providedIn: 'root',
})
export class SolutionChatService {
  constructor(
    private appSystemService: AppSystemService,
    private store: Store,
    private logger: NGXLogger,
  ) {}

  async saveChatHistory(projectId: string, chatHistory: any[]): Promise<void> {
    try {
      const projects = await firstValueFrom(
        this.store.select(ProjectsState.getProjects),
      );

      const project = projects?.find((p) => p.metadata.id === projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      const fullPath = joinPaths(project.project, SOLUTION_CHAT_FILE_NAME);

      this.logger.info('Saving chat history to:', fullPath);
      await this.appSystemService.createFileWithContent(
        fullPath,
        JSON.stringify(chatHistory, null, 2),
      );
    } catch (error) {
      this.logger.error('Error saving chat history:', error);
      throw error;
    }
  }

  async loadChatHistory(projectId: string): Promise<any[]> {
    try {
      const projects = await firstValueFrom(
        this.store.select(ProjectsState.getProjects),
      );

      const project = projects?.find((p) => p.metadata.id === projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      const fullPath = joinPaths(project.project, SOLUTION_CHAT_FILE_NAME);
      this.logger.info('Loading chat history from:', fullPath);
      const result = await this.appSystemService.readFile(fullPath);
      return result ? JSON.parse(result) : [];
    } catch (error) {
      if ((error as any)?.code === 'ENOENT') {
        return [];
      }
      this.logger.error('Error loading chat history:', error);
      throw error;
    }
  }
}
