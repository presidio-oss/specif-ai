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
  SetSelectedUserStory,
} from '../../store/user-stories/user-stories.actions';
import { ProjectsState } from '../../store/projects/projects.state';
import {
  IUserStoriesRequest,
  IUserStory,
} from '../../model/interfaces/IUserStory';
import { FeatureService } from '../../services/feature/feature.service';
import { CreateFile, ReadFile } from '../../store/projects/projects.actions';
import { ClipboardService } from '../../services/clipboard.service';
import { ITaskRequest, ITasksResponse } from '../../model/interfaces/ITask';
import {
  AddBreadcrumb,
  DeleteBreadcrumb,
} from '../../store/breadcrumb/breadcrumb.actions';
import { DialogService } from '../../services/dialog/dialog.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { getNavigationParams } from '../../utils/common.utils';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowRight,
  heroArrowTopRightOnSquare,
} from '@ng-icons/heroicons/outline';
import { ListItemComponent } from '../../components/core/list-item/list-item.component';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import {
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
import {
  EXPORT_FILE_FORMATS,
  ExportFileFormat,
} from 'src/app/constants/export.constants';
import { processUserStoryContentForView } from 'src/app/utils/user-story.utils';
import { RequirementIdService } from 'src/app/services/requirement-id.service';
import { ModalDialogCustomComponent } from 'src/app/components/modal-dialog/modal-dialog.component';
import {
  DropdownOptionGroup,
  ExportDropdownComponent,
} from 'src/app/export-dropdown/export-dropdown.component';
import { WorkflowProgressDialogComponent } from '../../components/workflow-progress/workflow-progress-dialog/workflow-progress-dialog.component';
import { WorkflowType } from '../../model/interfaces/workflow-progress.interface';
import { WorkflowProgressService } from '../../services/workflow-progress/workflow-progress.service';
import { TestCaseUtilsService } from 'src/app/services/test-case/test-case-utils.service';
import { SPECIFAI_REQ_DOCS } from 'src/app/constants/specifai-req-types-docs.constants';
import { ElectronService } from 'src/app/electron-bridge/electron.service';

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
      heroArrowTopRightOnSquare,
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
  docUrl = SPECIFAI_REQ_DOCS.find((doc) => doc.id === REQUIREMENT_TYPE.US)?.url || '';
  electronService = inject(ElectronService);

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
    (story: IUserStory) => [story.id, story.name, story.pmoId],
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
    private toast: ToasterService,
    private requirementIdService: RequirementIdService,
    private workflowProgressService: WorkflowProgressService,
    private testCaseUtilsService: TestCaseUtilsService,
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

  navigateToEditPRD() {
    this.store.dispatch(
      new DeleteBreadcrumb(
        `${this.navigation.fileName.split('-')[0] ?? ''} - User Stories`,
      ),
    );
    this.router.navigate(['/edit'], {
      state: {
        data: this.navigation.data,
        id: this.navigation.projectId,
        folderName: this.navigation.folderName,
        fileName: this.navigation.fileName,
        req: this.navigation.selectedRequirement,
      },
    });
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

  navigateToTestCases(userStory: IUserStory, index: number) {
    this.store.dispatch(new SetSelectedUserStory(userStory.id));
    this.router.navigate(['/test-cases', userStory.id], {
      queryParams: {
        projectName: this.currentProject,
        prdId: this.newFileName.split('-')[0],
        prdTitle: encodeURIComponent(this.navigation.selectedRequirement.title),
        prdDescription: encodeURIComponent(
          this.navigation.selectedRequirement.requirement,
        ),
      },
      state: {
        projectId: this.navigation.projectId,
        folderName: this.navigation.folderName,
        fileName: this.navigation.fileName,
        selectedRequirement: userStory,
        data: this.navigation.data,
      },
    });
  }

  navigateToAppIntegrations() {
    this.router.navigate([`/apps/${this.navigation.projectId}`], {
      state: {
        data: this.navigation,
        selectedFolder: {
          title: 'app-integrations',
          id: this.navigation.projectId,
        },
        selectedIntegration: 'jira',
        openPmoAccordion: true,
      },
    });
  }

  private async deleteTestCasesForUserStories(
    userStories: IUserStory[],
  ): Promise<void> {
    if (!userStories || userStories.length === 0) {
      return;
    }

    this.logger.debug(
      `Checking for test cases to delete for ${userStories.length} user stories`,
    );

    const userStoryIds = userStories.map((story) => story.id);
    await this.testCaseUtilsService.deleteTestCasesForUserStories(
      this.currentProject,
      userStoryIds,
    );
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

    if (
      regenerate &&
      this.userStoriesInState &&
      this.userStoriesInState.length > 0
    ) {
      try {
        await this.deleteTestCasesForUserStories(this.userStoriesInState);
        this.logger.debug(
          'Successfully deleted test cases for existing user stories',
        );
      } catch (error) {
        this.logger.error('Error deleting test cases:', error);
      }
    }

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

  private async checkForLinkedTestCases(userStoryId: string): Promise<boolean> {
    return this.testCaseUtilsService.checkForLinkedTestCases(
      this.currentProject,
      userStoryId,
    );
  }

  private async checkForAnyLinkedTestCases(
    userStories: IUserStory[],
  ): Promise<boolean> {
    if (!userStories || userStories.length === 0) {
      return false;
    }

    for (const userStory of userStories) {
      const hasLinkedTestCases = await this.checkForLinkedTestCases(
        userStory.id,
      );
      if (hasLinkedTestCases) {
        return true;
      }
    }

    return false;
  }

  addMoreContext(regenerate: boolean = false) {
    if (
      regenerate &&
      this.userStoriesInState &&
      this.userStoriesInState.length > 0
    ) {
      this.checkForAnyLinkedTestCases(this.userStoriesInState).then(
        (hasLinkedTestCases) => {
          if (hasLinkedTestCases) {
            this.dialogService
              .confirm({
                title: 'Warning: Test Cases Will Be Deleted',
                description:
                  'Regenerating user stories will delete all associated test cases. Are you sure you want to proceed?',
                cancelButtonText: 'Cancel',
                confirmButtonText: 'Proceed',
              })
              .subscribe((confirmed) => {
                if (confirmed) {
                  this.showContextDialog(regenerate);
                }
              });
          } else {
            this.showContextDialog(regenerate);
          }
        },
      );
    } else {
      this.showContextDialog(regenerate);
    }
  }

  private showContextDialog(regenerate: boolean) {
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

  private formatDescriptionForView(
    description: string | undefined,
  ): string | null {
    if (!description) return null;
    return processUserStoryContentForView(description, 180);
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

    if (this.userStoriesInState.length > 0) {
      this.exportOptions.push(
        {
          groupName: 'HAI Actions',
          options: [
            {
              label: 'Regenerate',
              callback: addMoreContext.bind(this),
              icon: 'heroDocument',
              additionalInfo: 'User Stories & Tasks',
              isTimestamp: false,
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
              additionalInfo: 'JSON Format',
              isTimestamp: false,
            },
            {
              label: 'Download',
              callback: exportExcel.bind(this),
              icon: 'heroDocumentText',
              additionalInfo: 'Excel (.xlsx)',
              isTimestamp: false,
            },
          ],
        },
      );
    }

    return this.exportOptions;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
