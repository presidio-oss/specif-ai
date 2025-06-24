import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { UserStoriesState } from '../../store/user-stories/user-stories.state';
import {
  ExportUserStories,
  GetUserStories,
  SetCurrentConfig,
  SetSelectedProject,
  BulkEditUserStories,
} from '../../store/user-stories/user-stories.actions';
import { ProjectsState } from '../../store/projects/projects.state';
import {
  IUserStoriesRequest,
  IUserStory,
} from '../../model/interfaces/IUserStory';
import { FeatureService } from '../../services/feature/feature.service';
import {
  CreateFile,
  ReadFile,
  UpdateFile,
} from '../../store/projects/projects.actions';
import { ClipboardService } from '../../services/clipboard.service';
import { ITaskRequest, ITasksResponse } from '../../model/interfaces/ITask';
import { AddBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';
import { DialogService } from '../../services/dialog/dialog.service';
import {
  getJiraTokenInfo,
  storeJiraToken,
} from '../../integrations/jira/jira.utils';
import { JiraService } from '../../integrations/jira/jira.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { APP_INTEGRATIONS, JIRA_TOAST } from '../../constants/toast.constant';
import { ElectronService } from '../../electron-bridge/electron.service';
import { getNavigationParams } from '../../utils/common.utils';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowRight } from '@ng-icons/heroicons/outline';
import { ListItemComponent } from '../../components/core/list-item/list-item.component';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import {
  CONFIRMATION_DIALOG,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import { SearchInputComponent } from '../../components/core/search-input/search-input.component';
import { SearchService } from '../../services/search/search.service';
import {
  BehaviorSubject,
  map,
  Subject,
  takeUntil,
  distinctUntilChanged,
} from 'rxjs';
import { EXPORT_FILE_FORMATS, ExportFileFormat } from 'src/app/constants/export.constants';
import { processUserStoryContentForView } from 'src/app/utils/user-story.utils';
import { RequirementIdService } from 'src/app/services/requirement-id.service';
import { ModalDialogCustomComponent } from 'src/app/components/modal-dialog/modal-dialog.component';
import { DropdownOptionGroup, ExportDropdownComponent } from 'src/app/export-dropdown/export-dropdown.component';
import { WorkflowProgressDialogComponent } from '../../components/workflow-progress/workflow-progress-dialog/workflow-progress-dialog.component';
import { WorkflowType } from '../../model/interfaces/workflow-progress.interface';
import { WorkflowProgressService } from '../../services/workflow-progress/workflow-progress.service';

@Component({
  selector: 'app-user-stories',
  templateUrl: './user-stories.component.html',
  styleUrls: ['./user-stories.component.scss'],
  standalone: true,
  imports: [
    ButtonComponent,
    MatMenuModule,
    AsyncPipe,
    NgIf,
    NgIconComponent,
    NgForOf,
    ListItemComponent,
    BadgeComponent,
    SearchInputComponent,
    ExportDropdownComponent,
    MatTooltipModule,
    WorkflowProgressDialogComponent,
  ],
  providers: [
    provideIcons({
      heroArrowRight,
    }),
  ],
})
export class UserStoriesComponent implements OnInit, OnDestroy {
  protected readonly WorkflowType = WorkflowType;
  currentProject!: string;
  newFileName: string = '';
  entityType: string = 'US';
  selectedRequirement: any = {};
  metadata: any = {};
  private searchTerm$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();
  router = inject(Router);
  logger = inject(NGXLogger);
  store = inject(Store);
  searchService = inject(SearchService);
  requirementFile: any = [];
  userStories: IUserStory[] = [];
  isGeneratingStories: boolean = false;
  storyGenerationComplete: boolean = false;
  showProgressDialog: boolean = false;

  isTokenAvailable: boolean = true;
  navigation: {
    projectId: string;
    folderName: string;
    fileName: string;
    selectedRequirement: any;
    data: any;
  } = {
      projectId: '',
      folderName: '',
      fileName: '',
      selectedRequirement: {},
      data: {},
    };

  userStories$ = this.store.select(UserStoriesState.getUserStories).pipe(
    map((stories) =>
      stories.map((story) => ({
        ...story,
        formattedDescription: this.formatDescriptionForView(story.description),
      })),
    ),
  );

  filteredUserStories$ = this.searchService.filterItems(
    this.userStories$,
    this.searchTerm$,
    (story: IUserStory) => [story.id, story.name, story.storyTicketId],
  );

  selectedProject$ = this.store.select(ProjectsState.getSelectedProject);
  selectedFileContent$ = this.store.select(
    ProjectsState.getSelectedFileContent,
  );

  userStoriesInState: IUserStory[] = [];

  readonly dialogService = inject(DialogService);

  onSearch(term: string) {
    this.searchTerm$.next(term);
  }

  exportOptions: DropdownOptionGroup[] = [];
  exportedProjectId: string = '';

  constructor(
    private featureService: FeatureService,
    private clipboardService: ClipboardService,
    private jiraService: JiraService,
    private electronService: ElectronService,
    private toast: ToasterService,
    private requirementIdService: RequirementIdService,
    private workflowProgressService: WorkflowProgressService,
  ) {
    this.navigation = getNavigationParams(this.router.getCurrentNavigation());
    this.store.dispatch(
      new SetCurrentConfig({
        projectId: this.navigation.projectId,
        folderName: this.navigation.folderName,
        fileName: this.navigation.fileName,
        reqId: this.navigation.fileName.split('-')[0],
        featureId: '',
      }),
    );

    this.store.select(ProjectsState.getMetadata).subscribe((res) => {
      this.metadata = res;
    });

    this.store.dispatch(
      new AddBreadcrumb({
        label: this.navigation.folderName,
        url: `/apps/${this.navigation.projectId}`,
        state: {
          data: this.navigation.data,
          selectedFolder: {
            title: this.navigation.folderName,
            id: this.navigation.projectId,
            metadata: this.navigation.data,
          },
        },
      }),
    );
    this.store.dispatch(
      new AddBreadcrumb({
        label: `${this.navigation.fileName.split('-')[0] ?? ''} - User Stories`,
        tooltipLabel: `${this.navigation.fileName.split('-')[0]}:  ${this.navigation.selectedRequirement.title} - User Stories`,
        url: `/user-stories/${this.navigation.projectId}`,
        state: {
          data: this.navigation.data,
          id: this.navigation.projectId,
          folderName: this.navigation.folderName,
          fileName: this.navigation.fileName,
          req: this.navigation.selectedRequirement,
        },
      }),
    );
  }

  ngOnInit() {
    this.store.select(ProjectsState.getMetadata).subscribe((res) => {
      this.metadata = res;
    });

    this.store.dispatch(
      new ReadFile(`${this.navigation.folderName}/${this.navigation.fileName}`),
    );

    this.isTokenAvailable = (() => {
      const tokenInfo = getJiraTokenInfo(this.navigation.projectId);
      return (
        tokenInfo.projectKey ===
        this.metadata.integration?.jira?.jiraProjectKey && !!tokenInfo.token
      );
    })();

    if (this.navigation.projectId) {
      this.workflowProgressService
        .getCreationStatusObservable(
          this.navigation.projectId,
          WorkflowType.Story,
        )
        .pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged(
            (prev, curr) =>
              prev.isCreating === curr.isCreating &&
              prev.isComplete === curr.isComplete &&
              prev.isFailed === curr.isFailed,
          ),
        )
        .subscribe((status) => {
          const wasGenerating = this.isGeneratingStories;
          this.isGeneratingStories = status.isCreating;
          this.storyGenerationComplete = status.isComplete;

          this.showProgressDialog = status.isCreating || status.isComplete;
          if (wasGenerating && !status.isCreating && status.isComplete) {
            this.resetStoryProgress();
          }
        });
    }

    this.selectedProject$.subscribe((project) => {
      this.currentProject = project;
      this.store.dispatch(new SetSelectedProject(this.currentProject));
      this.logger.debug(project, 'selected project');
      this.newFileName = this.navigation.fileName.replace('base', 'feature');
      project && this.getLatestUserStories();
    });

    this.selectedFileContent$.subscribe((res: any) => {
      this.requirementFile = res;
      this.updateExportOptionsTimestamps();
    });

    this.userStories$.subscribe((userStories: IUserStory[]) => {
      this.userStoriesInState = userStories;
      this.getExportOptions();
    });
  }

  navigateToAddUserStory() {
    this.router
      .navigate(['/story', 'add'], {
        state: {
          folderName: this.navigation.folderName,
          fileName: this.newFileName,
          fileData: this.navigation.data,
          req: this.navigation.selectedRequirement,
        },
      })
      .then();
  }

  navigateToEditUserStory(selectedUserStory: IUserStory) {
    this.router
      .navigate(['/story', 'edit', selectedUserStory.id], {
        state: {
          data: selectedUserStory,
          folderName: this.navigation.folderName,
          fileName: this.newFileName,
          fileData: this.navigation.data,
          req: this.navigation.selectedRequirement,
        },
      })
      .then();
  }

  navigateToTaskList(userStory: IUserStory, index: number) {
    this.router.navigate(['/task-list', userStory.id], {
      state: {
        config: {
          folderName: this.navigation.folderName,
          fileName: this.navigation.fileName,
          projectId: this.navigation.projectId,
          newFileName: this.newFileName,
          currentProject: this.currentProject,
          i: index,
          featureId: userStory.id,
          featureName: userStory.name,
          reqId: this.newFileName.split('-')[0],
        },
      },
    });
  }

  navigateToAppIntegrations() {
    this.router.navigate([`/apps/${this.navigation.projectId}`], {
      state: { openAppIntegrations: 'true' },
    });
  }

  async generateUserStories(
    regenerate: boolean = false,
    extraContext: string = '',
  ) {
    this.setupStoryProgressListener();
    await this.workflowProgressService.setCreating(
      this.navigation.projectId,
      WorkflowType.Story,
    );

    let request: IUserStoriesRequest = {
      appId: this.navigation.projectId,
      appName: this.metadata.name,
      appDescription: this.metadata.description,
      reqId: this.newFileName.split('-')[0],
      reqName: this.navigation.selectedRequirement.title,
      reqDesc: this.navigation.selectedRequirement.requirement,
      regenerate: regenerate,
      technicalDetails: this.metadata.technicalDetails || '',
      extraContext: extraContext,
    };

    this.featureService
      .generateUserStories(request)
      .then((response) => {
        this.userStories = response;
        this.generateTasks(regenerate).then(() => {
          this.updateWithUserStories(this.userStories, regenerate);
        });
      })
      .catch(async (error) => {
        await this.workflowProgressService.setFailed(
          this.navigation.projectId,
          WorkflowType.Story,
          {
            timestamp: new Date().toISOString(),
            reason: error?.message || 'Failed to generate user stories',
          },
        );
        this.toast.showError(
          TOASTER_MESSAGES.ENTITY.GENERATE.FAILURE(this.entityType, regenerate),
        );
      });
    this.dialogService.closeAll();
  }

  async generateTasks(regenerate: boolean): Promise<void[]> {
    await this.workflowProgressService.setCreating(
      this.navigation.projectId,
      WorkflowType.Task,
    );

    const requests = this.userStories.map(async (userStory: IUserStory) => {
      let request: ITaskRequest = {
        appId: this.navigation.projectId,
        appName: this.metadata.name,
        appDescription: this.metadata.description,
        reqId: this.navigation.fileName.split('-')[0],
        featureId: userStory.id,
        name: userStory.name,
        description: userStory.description,
        regenerate: regenerate,
        technicalDetails: this.metadata.technicalDetails || '',
        extraContext: '',
      };
      return this.featureService
        .generateTask(request)
        .then((response: ITasksResponse | undefined) => {
          userStory.tasks = this.featureService.parseTaskResponse(response);
        })
        .catch((error) => {
          console.error(
            'Error generating task for user story:',
            userStory.id,
            error,
          );
        });
    });

    try {
      const result = await Promise.all(requests);
      await this.workflowProgressService.setComplete(
        this.navigation.projectId,
        WorkflowType.Task,
      );
      return result;
    } catch (error: any) {
      await this.workflowProgressService.setFailed(
        this.navigation.projectId,
        WorkflowType.Task,
        {
          timestamp: new Date().toISOString(),
          reason: error?.message || 'Failed to generate tasks',
        },
      );
      throw error;
    }
  }

  updateWithUserStories(
    userStories: IUserStory[],
    regenerate: boolean = false,
  ) {
    const nextIds = {
      story: this.requirementIdService.getNextRequirementId(
        REQUIREMENT_TYPE.US,
      ),
      task: this.requirementIdService.getNextRequirementId(
        REQUIREMENT_TYPE.TASK,
      ),
    };

    const processedUserStories = userStories.map((userStory) => ({
      ...userStory,
      id: `US${nextIds.story++}`,
      tasks: userStory.tasks?.map((task) => ({
        ...task,
        id: `TASK${nextIds.task++}`,
      })),
    }));

    this.store.dispatch(
      new CreateFile(
        `${this.navigation.folderName}`,
        { features: processedUserStories },
        this.navigation.fileName.replace(/\-base.json$/, ''),
      ),
    );

    this.requirementIdService
      .updateRequirementCounters({
        [REQUIREMENT_TYPE.US]: nextIds.story - 1,
        [REQUIREMENT_TYPE.TASK]: nextIds.task - 1,
      })
      .then();

    setTimeout(async () => {
      this.getLatestUserStories();
      await this.workflowProgressService.setComplete(
        this.navigation.projectId,
        WorkflowType.Story,
      );
      this.toast.showSuccess(
        TOASTER_MESSAGES.ENTITY.GENERATE.SUCCESS(this.entityType, regenerate),
      );
    }, 2000);
  }

  getLatestUserStories() {
    this.store.dispatch(
      new GetUserStories(
        `${this.currentProject}/${this.navigation.folderName}/${this.newFileName}`,
      ),
    );
  }

  copyUserStoryContent(event: Event, userStory: IUserStory) {
    event.stopPropagation();
    const userStoryContent = `${userStory.id}: ${userStory.name}\n${userStory.description || ''}`;
    const success = this.clipboardService.copyToClipboard(userStoryContent);
    if (success) {
      this.toast.showSuccess(
        TOASTER_MESSAGES.ENTITY.COPY.SUCCESS(this.entityType, userStory.id),
      );
    } else {
      this.toast.showError(
        TOASTER_MESSAGES.ENTITY.COPY.FAILURE(this.entityType, userStory.id),
      );
    }
  }

  exportUserStories(exportType: ExportFileFormat) {
    this.store.dispatch(
      new ExportUserStories({
        type: exportType,
      }),
    );
  }

  addMoreContext(regenerate: boolean = false) {
    this.dialogService
      .createBuilder()
      .forComponent(ModalDialogCustomComponent)
      .withData({
        title: 'Generate User Story',
        description:
          'Include additional context to generate relevant user story',
        placeholder: 'Add additional context for the user story',
      })
      .withWidth('600px')
      .open()
      .afterClosed()
      .subscribe((emittedValue) => {
        if (emittedValue !== undefined)
          this.generateUserStories(regenerate, emittedValue);
        return;
      });
  }

  syncRequirementWithJira(): void {
    this.dialogService
      .confirm({
        title: 'Push to JIRA',
        description: 'This action will override the existing content in JIRA with your local changes. Any updates made directly in JIRA will be lost. Do you want to continue?',
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Push to JIRA',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.validateAndExecuteWithJiraToken((token, jiraUrl) => {
          console.log('Token exists and is valid, making API call', token);
          this.syncJira(token, jiraUrl);
        });
      });
  }

  syncRequirementFromJira(): void {
    this.dialogService
      .confirm({
        title: 'Pull from JIRA',
        description: 'This action will override your local content with the latest updates from JIRA. Any unsaved local changes will be lost. Do you want to continue?',
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Pull from JIRA',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.validateAndExecuteWithJiraToken((token, jiraUrl) => {
          console.log('Token exists and is valid, syncing from JIRA', token);
          this.syncFromJira(token, jiraUrl);
        });
      });
  }

  promptReauthentication(): void {
    const jiraIntegration = this.metadata?.integration?.jira;

    if (!jiraIntegration) {
      this.openConfirmationDialog(
        CONFIRMATION_DIALOG.JIRA_DETAILS_MISSING,
        () => this.navigateToAppIntegrations(),
      );
      return;
    }

    this.openConfirmationDialog(CONFIRMATION_DIALOG.JIRA_REAUTHENTICATION, () =>
      this.handleJiraOAuth(jiraIntegration),
    );
  }

  private handleJiraOAuth(jiraIntegration: any): void {
    const { clientId, clientSecret, redirectUrl } = jiraIntegration;

    const oauthParams = { clientId, clientSecret, redirectUri: redirectUrl };
    this.electronService
      .startJiraOAuth(oauthParams)
      .then((authResponse) => {
        storeJiraToken(
          authResponse,
          jiraIntegration.jiraProjectKey,
          this.navigation.projectId,
        );
        console.debug('Token received and stored.', authResponse.accessToken);
        this.toast.showSuccess(APP_INTEGRATIONS.JIRA.SUCCESS);
      })
      .catch((error) => {
        console.error('Error during OAuth process:', error);
        this.toast.showError(APP_INTEGRATIONS.JIRA.ERROR);
      });
  }

  private openConfirmationDialog(
    dialogConfig: any,
    onConfirm: () => void,
  ): void {
    this.dialogService
      .confirm({
        title: dialogConfig.TITLE,
        description: dialogConfig.DESCRIPTION,
        cancelButtonText: dialogConfig.CANCEL_BUTTON_TEXT,
        confirmButtonText: dialogConfig.PROCEED_BUTTON_TEXT,
      })
      .subscribe((res) => {
        if (res) onConfirm();
      });
  }

  syncJira(token: string, jiraUrl: string): void {
    const requestPayload: any = {
      epicName: '',
      epicDescription: '',
      epicTicketId: '',
      jiraUrl: jiraUrl,
      token: token,
      projectKey: this.metadata.integration.jira.jiraProjectKey,
      features: [],
    };

    requestPayload.epicName = this.requirementFile.title;
    requestPayload.epicDescription = this.requirementFile.requirement;
    requestPayload.epicTicketId = this.requirementFile.epicTicketId
      ? this.requirementFile.epicTicketId
      : '';

    this.userStories = this.userStoriesInState;

    requestPayload.features = this.userStories.map((story) => {
      return {
        id: story.id,
        name: story.name,
        description: story.description,
        storyTicketId: story.storyTicketId ? story.storyTicketId : '',
        tasks: story?.tasks?.map((task) => {
          return {
            list: task.list,
            acceptance: task.acceptance,
            id: task.id,
            subTaskTicketId: task.subTaskTicketId ? task.subTaskTicketId : '',
          };
        }),
      };
    });

    this.jiraService.createOrUpdateTickets(requestPayload).subscribe({
      next: (response) => {
        console.debug('Jira API Response:', response);

        const matchedEpic = response.epicName === this.requirementFile.title;

        if (matchedEpic) {
          this.requirementFile.epicTicketId = response.epicTicketId;
        }

        this.requirementFile.lastPushToJiraTimestamp = new Date().toISOString();

        this.updateExportOptionsTimestamps();

        const updatedFeatures = this.userStories.map((existingFeature: any) => {
          const matchedFeature = response.features.find(
            (responseFeature: any) =>
              responseFeature.storyName === existingFeature.name,
          );

          if (matchedFeature) {
            existingFeature.storyTicketId = matchedFeature.storyTicketId;
            existingFeature.tasks.forEach((existingTask: any) => {
              const matchedTask = matchedFeature.tasks.find(
                (responseTask: any) =>
                  responseTask.subTaskName === existingTask.list,
              );

              if (matchedTask) {
                existingTask.subTaskTicketId = matchedTask.subTaskTicketId;
              }
            });
          }

          return existingFeature;
        });

        this.store.dispatch(
          new UpdateFile(
            `${this.navigation.folderName}/${this.navigation.fileName}`,
            this.requirementFile,
          ),
        );

        this.store.dispatch(
          new BulkEditUserStories(
            `${this.navigation.folderName}/${this.navigation.fileName.replace(/\-base.json$/, '-feature.json')}`,
            updatedFeatures,
          ),
        );
        this.toast.showSuccess(JIRA_TOAST.SUCCESS);
      },
      error: (error) => {
        console.error('Error updating feature.json:', error);
      },
    });
  }

  private syncFromJira(token: string, jiraUrl: string): void {
    const requestPayload: any = {
      epicName: '',
      epicDescription: '',
      epicTicketId: '',
      jiraUrl: jiraUrl,
      token: token,
      projectKey: this.metadata.integration.jira.jiraProjectKey,
      features: [],
    };

    requestPayload.epicName = this.requirementFile.title;
    requestPayload.epicDescription = this.requirementFile.requirement;
    requestPayload.epicTicketId = this.requirementFile.epicTicketId || '';

    this.userStories = this.userStoriesInState;

    requestPayload.features = this.userStories.map((story) => ({
      id: story.id,
      name: story.name,
      description: story.description,
      storyTicketId: story.storyTicketId || '',
      tasks: story?.tasks?.map((task) => ({
        id: task.id,
        list: task.list,
        acceptance: task.acceptance,
        subTaskTicketId: task.subTaskTicketId || '',
      })) || [],
    }));

    this.jiraService.syncFromJira(requestPayload).subscribe({
      next: (response) => {
        console.debug('JIRA Sync Response:', response);
        this.requirementFile.lastPullFromJiraTimestamp = new Date().toISOString();
        this.updateExportOptionsTimestamps();
        this.updateLocalContentFromJira(response);
        this.toast.showSuccess('Successfully synced from JIRA');
      },
      error: (error) => {
        console.error('Error syncing from JIRA:', error);
        this.toast.showError('Failed to sync from JIRA');
      },
    });
  }

  private formatDescriptionForView(
    description: string | undefined,
  ): string | null {
    if (!description) return null;
    return processUserStoryContentForView(description, 180);
  }

  private updateLocalContentFromJira(syncResponse: any): void {
    if (syncResponse.epic) {
      const updatedRequirementFile = {
        ...this.requirementFile,
        title: syncResponse.epic.title,
        requirement: syncResponse.epic.requirement,
        epicTicketId: syncResponse.epic.epicTicketId,
        lastPullFromJiraTimestamp: this.requirementFile.lastPullFromJiraTimestamp
      };

      this.store.dispatch(
        new UpdateFile(
          `${this.navigation.folderName}/${this.navigation.fileName}`,
          updatedRequirementFile,
        ),
      );
    }

    if (syncResponse.features && syncResponse.features.length > 0) {
      const updatedUserStories = this.userStories.map((existingStory) => {
        const syncedStory = syncResponse.features.find(
          (feature: any) =>
            feature.storyTicketId === existingStory.storyTicketId ||
            feature.id === existingStory.id
        );

        if (syncedStory) {
          const updatedTasks = existingStory.tasks?.map((existingTask) => {
            const syncedTask = syncedStory.tasks?.find(
              (task: any) =>
                task.subTaskTicketId === existingTask.subTaskTicketId ||
                task.id === existingTask.id
            );

            if (syncedTask) {
              return {
                ...existingTask,
                list: syncedTask.list || existingTask.list,
                acceptance: syncedTask.acceptance || existingTask.acceptance,
                subTaskTicketId: syncedTask.subTaskTicketId || existingTask.subTaskTicketId,
                status: syncedTask.status,
                lastUpdated: syncedTask.lastUpdated,
              };
            }
            return existingTask;
          }) || [];

          return {
            ...existingStory,
            name: syncedStory.name,
            description: syncedStory.description,
            storyTicketId: syncedStory.storyTicketId,
            status: syncedStory.status,
            lastUpdated: syncedStory.lastUpdated,
            tasks: updatedTasks,
          };
        }

        return existingStory;
      });

      this.store.dispatch(
        new BulkEditUserStories(
          `${this.navigation.folderName}/${this.navigation.fileName.replace(/\-base.json$/, '-feature.json')}`,
          updatedUserStories,
        ),
      );

      // Refresh the user stories view
      setTimeout(() => {
        this.getLatestUserStories();
      }, 1000);
    }
  }


  private updateExportOptionsTimestamps(): void {
    if (this.exportOptions && this.exportOptions.length > 1) {
      const jiraOptions = this.exportOptions[2].options;
      if (jiraOptions && jiraOptions.length > 1) {
        if (this.requirementFile?.lastPushToJiraTimestamp) {
          jiraOptions[0].additionalInfo = this.requirementFile.lastPushToJiraTimestamp;
        } else {
          jiraOptions[0].additionalInfo = undefined;
        }

        if (this.requirementFile?.lastPullFromJiraTimestamp) {
          jiraOptions[1].additionalInfo = this.requirementFile.lastPullFromJiraTimestamp;
        } else {
          jiraOptions[1].additionalInfo = undefined;
        }
      }
    }
  }

  private validateAndExecuteWithJiraToken(callback: (token: string, jiraUrl: string) => void): void {
    const { token, tokenExpiration, jiraURL, refreshToken } = getJiraTokenInfo(
      this.navigation.projectId,
    );
    const isJiraTokenValid =
      token &&
      tokenExpiration &&
      new Date() < new Date(tokenExpiration) &&
      this.isTokenAvailable;

    if (isJiraTokenValid) {
      callback(token as string, jiraURL as string);
    } else if (refreshToken) {
      this.electronService
        .refreshJiraToken(refreshToken)
        .then((authResponse) => {
          storeJiraToken(
            authResponse,
            this.metadata?.integration?.jira?.jiraProjectKey,
            this.navigation.projectId,
          );
          callback(authResponse.accessToken, jiraURL as string);
        })
        .catch((error) => {
          console.error('Error during token refresh:', error);
          this.promptReauthentication();
        });
    } else {
      this.promptReauthentication();
    }
  }

  private setupStoryProgressListener(): void {
    if (!this.navigation.projectId) return;

    const workflowTypes = [WorkflowType.Story, WorkflowType.Task];

    workflowTypes.forEach((workflowType) => {
      if (
        !this.workflowProgressService.hasGlobalListener(
          this.navigation.projectId!,
          workflowType,
        )
      ) {
        this.workflowProgressService.registerGlobalListener(
          this.navigation.projectId!,
          workflowType,
        );
      }

      this.workflowProgressService.clearProgressEvents(
        this.navigation.projectId!,
        workflowType,
      );
    });
  }

  private resetStoryProgress(): void {
    if (!this.navigation.projectId) return;

    const workflowTypes = [WorkflowType.Story, WorkflowType.Task];

    workflowTypes.forEach((workflowType) => {
      this.workflowProgressService.removeGlobalListener(
        this.navigation.projectId!,
        workflowType,
      );
    });
  }

  closeProgressDialog(): void {
    this.showProgressDialog = false;

    if (this.navigation.projectId) {
      const workflowTypes = [WorkflowType.Story, WorkflowType.Task];
      workflowTypes.forEach((workflowType) => {
        this.workflowProgressService.clearCreationStatus(
          this.navigation.projectId!,
          workflowType,
        );
        this.workflowProgressService.clearProgressEvents(
          this.navigation.projectId!,
          workflowType,
        );
      });
    }
  }

  getExportOptions() {
    this.exportOptions = [];

    const addMoreContext = () => {
      this.addMoreContext(this.userStoriesInState.length > 0);
    };

    const exportJson = () => {
      this.exportUserStories(EXPORT_FILE_FORMATS.JSON);
    };

    const exportExcel = () => {
      this.exportUserStories(EXPORT_FILE_FORMATS.EXCEL);
    };

    const pushToJira = () => {
      this.syncRequirementWithJira();
    };

    const pullFromJira = () => {
      this.syncRequirementFromJira();
    };

    if (this.userStoriesInState.length > 0) {
      this.exportOptions.push(
        {
          groupName: 'HAI Actions',
          options: [
            {
              label: 'Regenerate',
              callback: addMoreContext.bind(this),
              icon: 'heroDocumentText',
              additionalInfo: 'User Stories & Tasks',
            },
          ],
        },
        {
          groupName: 'Export',
          options: [
            {
              label: 'Copy to Clipboard',
              callback: exportJson.bind(this),
              icon: 'heroPaperClip',
              additionalInfo: "JSON Format",
              isTimestamp: false,
            },
            {
              label: 'Download',
              callback: exportExcel.bind(this),
              icon: 'heroDocumentText',
              additionalInfo: "Excel (.xlsx)",
              isTimestamp: false,
            },
          ],
        }
      );

      const jiraOptions = [
        {
          label: 'Push to JIRA',
          callback: pushToJira.bind(this),
          icon: 'heroArrowUpTray',
          additionalInfo: this.requirementFile?.lastPushToJiraTimestamp || undefined,
        }
      ];

      if (this.requirementFile?.epicTicketId) {
        jiraOptions.push({
          label: 'Pull from JIRA',
          callback: pullFromJira.bind(this),
          icon: 'heroArrowDownTray',
          additionalInfo: this.requirementFile?.lastPullFromJiraTimestamp || undefined,
        });
      }

      this.exportOptions.push({
        groupName: 'JIRA',
        options: jiraOptions,
      });
    }

    return this.exportOptions;
  }


  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
