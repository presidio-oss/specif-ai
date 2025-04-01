import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { UserStoriesState } from '../../store/user-stories/user-stories.state';
import {
  EditUserStory,
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
import { LoadingService } from '../../services/loading.service';
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
import { NgIconComponent } from '@ng-icons/core';
import { ListItemComponent } from '../../components/core/list-item/list-item.component';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import {
  CONFIRMATION_DIALOG,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import { SearchInputComponent } from '../../components/core/search-input/search-input.component';
import { SearchService } from '../../services/search/search.service';
import { BehaviorSubject, map } from 'rxjs';
import { ExportFileFormat } from 'src/app/constants/export.constants';
import { processUserStoryContentForView } from 'src/app/utils/user-story.utils';
import { RequirementIdService } from 'src/app/services/requirement-id.service';
import { ModalDialogCustomComponent } from 'src/app/components/modal-dialog/modal-dialog.component';

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
    MatTooltipModule,
  ],
})
export class UserStoriesComponent implements OnInit {
  currentProject!: string;
  newFileName: string = '';
  entityType: string = 'US';
  selectedRequirement: any = {};
  metadata: any = {};
  private searchTerm$ = new BehaviorSubject<string>('');

  router = inject(Router);
  logger = inject(NGXLogger);
  store = inject(Store);
  searchService = inject(SearchService);
  requirementFile: any = [];
  userStories: IUserStory[] = [];

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

  constructor(
    private featureService: FeatureService,
    private clipboardService: ClipboardService,
    private loadingService: LoadingService,
    private jiraService: JiraService,
    private electronService: ElectronService,
    private toast: ToasterService,
    private requirementIdService: RequirementIdService,
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

    this.selectedProject$.subscribe((project) => {
      this.currentProject = project;
      this.store.dispatch(new SetSelectedProject(this.currentProject));
      this.logger.debug(project, 'selected project');
      this.newFileName = this.navigation.fileName.replace('base', 'feature');
      project && this.getLatestUserStories();
    });

    this.selectedFileContent$.subscribe((res: any) => {
      this.requirementFile = res;
    });

    this.userStories$.subscribe((userStories: IUserStory[]) => {
      this.userStoriesInState = userStories;
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

  generateUserStories(regenerate: boolean = false, extraContext: string = '') {
    let request: IUserStoriesRequest = {
      appId: this.navigation.projectId,
      reqId: this.newFileName.split('-')[0],
      reqDesc: this.navigation.selectedRequirement.requirement,
      regenerate: regenerate,
      technicalDetails: this.metadata.technicalDetails || '',
      extraContext: extraContext,
    };

    this.loadingService.setLoading(true);
    this.featureService.generateUserStories(request).then((response) => {
      this.userStories = response;
      this.generateTasks(regenerate).then(() => {
        this.updateWithUserStories(this.userStories, regenerate);
      });
    })
    .catch((error) => {
      this.loadingService.setLoading(false);
      this.toast.showError(
        TOASTER_MESSAGES.ENTITY.GENERATE.FAILURE(this.entityType, regenerate),
      );
    })
    this.dialogService.closeAll();
  }

  generateTasks(regenerate: boolean): Promise<void[]> {
    const requests = this.userStories.map(async (userStory: IUserStory) => {
      let request: ITaskRequest = {
        appId: this.navigation.projectId,
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
    return Promise.all(requests);
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

    setTimeout(() => {
      this.getLatestUserStories();
      this.toast.showSuccess(
        TOASTER_MESSAGES.ENTITY.GENERATE.SUCCESS(this.entityType, regenerate),
      );
      this.loadingService.setLoading(false);
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
        this.generateUserStories(regenerate, emittedValue);
      });
  }

  syncRequirementWithJira(): void {
    const { token, tokenExpiration, jiraURL, refreshToken } = getJiraTokenInfo(
      this.navigation.projectId,
    );
    const isJiraTokenValid =
      token &&
      tokenExpiration &&
      new Date() < new Date(tokenExpiration) &&
      this.isTokenAvailable;

    if (isJiraTokenValid) {
      console.log('Token exists and is valid, making API call', token);
      this.syncJira(token as string, jiraURL as string);
    } else if (refreshToken) {
      this.electronService
        .refreshJiraToken(refreshToken)
        .then((authResponse) => {
          storeJiraToken(
            authResponse,
            this.metadata?.integration?.jira?.jiraProjectKey,
            this.navigation.projectId,
          );
          console.debug(
            'Token refreshed, making API call',
            authResponse.accessToken,
          );
          this.syncJira(authResponse.accessToken, jiraURL as string);
        })
        .catch((error) => {
          console.error('Error during token refresh:', error);
          this.promptReauthentication();
        });
    } else {
      this.promptReauthentication();
    }
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

  private formatDescriptionForView(
    description: string | undefined,
  ): string | null {
    if (!description) return null;
    return processUserStoryContentForView(description, 180);
  }
}
