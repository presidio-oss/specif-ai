import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { UpdateMetadata } from '../../store/projects/projects.actions';
import { first } from 'rxjs/operators';
import { IProject } from '../../model/interfaces/projects.interface';
import { AppSystemService } from '../../services/app-system/app-system.service';

@Injectable({
  providedIn: 'root',
})
export class SolutionChatService {
  constructor(
    private appSystemService: AppSystemService,
    private store: Store,
  ) {}

  async saveChatHistory(projectId: string, chatHistory: any[]): Promise<void> {
    try {
      // Get project path from store
      const project = await this.store
        .select(ProjectsState.getProjects)
        .pipe(first())
        .toPromise()
        .then((projects: IProject[] | undefined) =>
          projects?.find((p) => p.metadata.id === projectId),
        );

      if (!project) {
        throw new Error('Project not found');
      }

      const fullPath = `${project.project}/solution_chat.json`;
      console.log('Saving chat history to:', fullPath);
      await this.appSystemService.createFileWithContent(
        fullPath,
        JSON.stringify(chatHistory, null, 2)
      );

      // Update metadata in store
      const updatedMetadata = {
        ...project.metadata,
        chatHistory
      };
      await this.store.dispatch(new UpdateMetadata(projectId, updatedMetadata)).toPromise();
    } catch (error) {
      console.error('Error saving chat history:', error);
      throw error;
    }
  }

  async loadChatHistory(projectId: string): Promise<any[]> {
    try {
      // Get project path from store
      const project = await this.store
        .select(ProjectsState.getProjects)
        .pipe(first())
        .toPromise()
        .then((projects: IProject[] | undefined) =>
          projects?.find((p) => p.metadata.id === projectId),
        );

      if (!project) {
        throw new Error('Project not found');
      }

      const fullPath = `${project.project}/solution_chat.json`;
      console.log('Loading chat history from:', fullPath);
      const result = await this.appSystemService.readFile(fullPath);
      return result ? JSON.parse(result) : [];
    } catch (error) {
      // If file doesn't exist, return empty array
      if ((error as any)?.message?.includes('no such file')) {
        return [];
      }
      console.error('Error loading chat history:', error);
      throw error;
    }
  }
}
