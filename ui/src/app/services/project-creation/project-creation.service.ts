import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import {
  CreateProject,
  UpdateMetadata,
} from '../../store/projects/projects.actions';
import { WorkflowProgressService } from '../workflow-progress/workflow-progress.service';
import { WorkflowType } from '../../model/interfaces/workflow-progress.interface';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ToasterService } from '../toaster/toaster.service';
import { AppSystemService } from '../app-system/app-system.service';
import { APP_CONSTANTS } from '../../constants/app.constants';
import { ICreateSolutionRequest } from 'src/app/model/interfaces/projects.interface';

export interface ProjectCreationOptions {
  projectData: ICreateSolutionRequest;
  projectName: string;
  isRetry?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectCreationService {
  private store = inject(Store);
  private workflowProgressService = inject(WorkflowProgressService);
  private electronService = inject(ElectronService);
  private toast = inject(ToasterService);
  private appSystemService = inject(AppSystemService);

  async createProject(options: ProjectCreationOptions): Promise<void> {
    const {
      projectData,
      projectName,
      isRetry = false,
      onSuccess,
      onError,
    } = options;

    const isRootDirectorySet = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    if (!isRootDirectorySet) {
      throw new Error('Please select a valid root directory.');
    }

    const isPathValid = await this.appSystemService.fileExists('');
    if (!isPathValid) {
      throw new Error('Please select a valid root directory.');
    }

    if (
      projectData?.id &&
      !this.workflowProgressService.hasGlobalListener(
        projectData.id,
        WorkflowType.Solution,
      )
    ) {
      this.workflowProgressService.registerGlobalListener(
        projectData.id,
        WorkflowType.Solution,
        this.electronService,
      );
    }

    await this.workflowProgressService.setCreating(
      projectData.id,
      WorkflowType.Solution,
    );

    this.store
      .dispatch(new CreateProject(projectName, projectData, isRetry))
      .subscribe({
        next: async () => {
          this.store.dispatch(
            new UpdateMetadata(projectData.id, {
              isFailed: false,
              failureInfo: undefined,
            }),
          );

          const successMessage = isRetry
            ? `Great! Your ${projectName} solution has been successfully recreated.`
            : `All set! Your ${projectName} solution is ready to roll.`;

          this.toast.showSuccess(successMessage);

          await this.workflowProgressService.setComplete(
            projectData.id,
            WorkflowType.Solution,
          );

          onSuccess?.();
        },
        error: async (error) => {
          const rawMessage = error?.message || '';
          const match = rawMessage.match(/Error: .*/);
          const cleanedMessage = match ? match[0] : rawMessage;

          const errorMessage = isRetry
            ? `Failed to retry project creation: ${cleanedMessage}`
            : cleanedMessage;

          this.store.dispatch(
            new UpdateMetadata(projectData.id, {
              isFailed: true,
              failureInfo: {
                timestamp: new Date().toISOString(),
                reason: errorMessage,
              },
            }),
          );

          this.toast.showError(errorMessage);

          await this.workflowProgressService.setFailed(
            projectData.id,
            WorkflowType.Solution,
            {
              timestamp: new Date().toISOString(),
              reason: errorMessage,
            },
          );

          onError?.(error);
        },
      });
  }
}
