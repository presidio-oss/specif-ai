import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import {
  EditUserStory,
  GetUserStories,
  SetCurrentConfig,
  SetSelectedUserStory,
} from '../../../store/user-stories/user-stories.actions';
import { UserStoriesState } from '../../../store/user-stories/user-stories.state';
import { NGXLogger } from 'ngx-logger';
import { IUserStory } from '../../../model/interfaces/IUserStory';
import { ITaskRequest, ITasksResponse } from '../../../model/interfaces/ITask';
import { FeatureService } from '../../../services/feature/feature.service';
import { LoadingService } from '../../../services/loading.service';
import {
  AddBreadcrumb,
  DeleteBreadcrumb,
} from '../../../store/breadcrumb/breadcrumb.actions';
import { ModalDialogCustomComponent } from '../../../components/modal-dialog/modal-dialog.component';
import { ProjectsState } from '../../../store/projects/projects.state';
import { DialogService } from '../../../services/dialog/dialog.service';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent } from '../../../components/core/button/button.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIconComponent } from '@ng-icons/core';
import { ListItemComponent } from '../../../components/core/list-item/list-item.component';
import { BadgeComponent } from '../../../components/core/badge/badge.component';
import { ClipboardService } from '../../../services/clipboard.service';
import {
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from 'src/app/constants/app.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { SearchInputComponent } from '../../../components/core/search-input/search-input.component';
import { SearchService } from '../../../services/search/search.service';
import { BehaviorSubject, map } from 'rxjs';
import { RichTextEditorComponent } from '../../../components/core/rich-text-editor/rich-text-editor.component';
import { processTaskContentForView } from 'src/app/utils/task.utils';
import { RequirementIdService } from 'src/app/services/requirement-id.service';
import { processUserStoryContentForView } from 'src/app/utils/user-story.utils';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    ButtonComponent,
    NgForOf,
    NgIconComponent,
    ListItemComponent,
    BadgeComponent,
    SearchInputComponent,
    MatTooltipModule,
    RichTextEditorComponent,
  ],
})
export class TaskListComponent implements OnInit, OnDestroy {
  activatedRoute = inject(ActivatedRoute);
  store = inject(Store);
  logger = inject(NGXLogger);
  router = inject(Router);
  clipboardService = inject(ClipboardService);
  searchService = inject(SearchService);
  userStoryId: string | null = '';
  userStories: IUserStory[] = [];
  selectedUserStory!: IUserStory;
  readonly dialogService = inject(DialogService);
  metadata: any = {};
  currentLabel: string = '';
  entityType: string = 'TASK';
  private searchTerm$ = new BehaviorSubject<string>('');

  config!: {
    fileName: string;
    folderName: string;
    projectId: string;
    newFileName: string;
    currentProject: string;
    i: number;
    featureId: string;
    featureName: string;
    reqId: string;
  };
  taskList$ = this.store.select(UserStoriesState.getTaskList).pipe(
    map((tasks) =>
      tasks.map((task) => ({
        ...task,
        formattedAcceptance: this.formatTaskForView(task.acceptance),
      })),
    ),
  );

  filteredTaskList$ = this.searchService.filterItems(
    this.taskList$,
    this.searchTerm$,
    (task: any) => [task.id, task.list, task.subTaskTicketId],
  );
  selectedUserStory$ = this.store.select(UserStoriesState.getSelectedUserStory);
  userStories$ = this.store.select(UserStoriesState.getUserStories);

  onSearch(term: string) {
    this.searchTerm$.next(term);
  }

  constructor(
    private featureService: FeatureService,
    private loadingService: LoadingService,
    private toastService: ToasterService,
    private requirementIdService: RequirementIdService,
  ) {
    this.userStoryId = this.activatedRoute.snapshot.paramMap.get('userStoryId');
    this.logger.debug('userStoryId', this.userStoryId);
    this.config = this.router.getCurrentNavigation()?.extras?.state?.[
      'config'
    ] as {
      fileName: string;
      folderName: string;
      projectId: string;
      newFileName: string;
      currentProject: string;
      i: number;
      featureId: string;
      featureName: string;
      reqId: string;
    };
    this.currentLabel = `${this.config.featureId} - Tasks`;
    if (this.userStoryId) {
      this.store.dispatch(new SetSelectedUserStory(this.userStoryId));
    }
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.currentLabel,
        tooltipLabel: `Tasks of ${this.config.featureId}: ${this.config.featureName}`,
      }),
    );
    this.store.select(ProjectsState.getMetadata).subscribe((metadata) => {
      this.metadata = metadata;
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(new DeleteBreadcrumb(this.currentLabel));
  }

  navigateToEditTask(taskId: string, storyId?: string) {
    this.router
      .navigate(['task/edit', storyId, taskId], {
        state: {
          config: this.config,
        },
      })
      .then();
  }

  navigateToAddTask() {
    this.router.navigate(['task/add', this.selectedUserStory?.id], {
      state: {
        config: this.config,
      },
    });
  }

  addExtraContext(regenerate: boolean = false) {
    this.dialogService
      .createBuilder()
      .forComponent(ModalDialogCustomComponent)
      .withData({
        title: 'Generate User Story Tasks',
        description:
          'Include additional context to generate relevant user story tasks',
        placeholder: 'Add additional context for the user story tasks',
      })
      .withWidth('600px')
      .open()
      .afterClosed()
      .subscribe((emittedValue) => {
        this.refineUserStoryIntoTasks(regenerate, emittedValue);
      });
  }

  refineUserStoryIntoTasks(regenerate: boolean = false, extraContext: string) {
    let request: ITaskRequest = {
      appId: this.config.projectId,
      reqId: this.config.newFileName.split('-')[0],
      featureId: this.selectedUserStory.id,
      name: this.selectedUserStory.name,
      description: this.selectedUserStory.description,
      regenerate: regenerate,
      technicalDetails: this.metadata.technicalDetails || '',
      extraContext: extraContext,
    };
    this.loadingService.setLoading(true);
    this.featureService.generateTask(request)
    .then((response: ITasksResponse) => {
      let tasksResponse = this.featureService.parseTaskResponse(response);
      const updatedUserStories = [...this.userStories];
      updatedUserStories[this.config.i] = {
        ...updatedUserStories[this.config.i],
        tasks: tasksResponse,
      };
      this.userStories = updatedUserStories;
      this.updateWithUserStories(
        updatedUserStories[this.config.i],
        regenerate,
      );
    })
    .catch((error) => {
      console.error('There was an error!', error);
      this.loadingService.setLoading(false);
      this.toastService.showError(
        TOASTER_MESSAGES.ENTITY.GENERATE.FAILURE(this.entityType, regenerate),
      );
    });
    this.dialogService.closeAll();
  }

  updateWithUserStories(userStories: IUserStory, regenerate: boolean = false) {
    let nextTaskId = this.requirementIdService.getNextRequirementId(
      REQUIREMENT_TYPE.TASK,
    );

    const processedUserStory = {
      ...userStories,
      tasks: userStories.tasks?.map((task) => ({
        ...task,
        id: `TASK${nextTaskId++}`,
      })),
    };

    this.store.dispatch(
      new EditUserStory(
        `${this.config.folderName}/${this.config.newFileName}`,
        processedUserStory,
      ),
    );

    this.requirementIdService
      .updateRequirementCounters({
        [REQUIREMENT_TYPE.TASK]: nextTaskId - 1,
      })
      .then();

    setTimeout(() => {
      this.getLatestUserStories();
      this.loadingService.setLoading(false);
      this.toastService.showSuccess(
        TOASTER_MESSAGES.ENTITY.GENERATE.SUCCESS(this.entityType, regenerate),
      );
    }, 2000);
  }

  getLatestUserStories() {
    this.store.dispatch(
      new GetUserStories(
        `${this.config.currentProject}/${this.config.folderName}/${this.config.newFileName}`,
      ),
    );

    this.userStories$.subscribe((userStories: IUserStory[]) => {
      this.userStories = userStories;
    });

    this.selectedUserStory$.subscribe((userStory: any) => {
      this.selectedUserStory = userStory;
    });
  }

  copyTaskContent(event: Event, task: any) {
    event.stopPropagation();
    const taskContent = `${task.id}: ${task.list}\n${task.acceptance || ''}`;
    const success = this.clipboardService.copyToClipboard(taskContent);
    if (success) {
      this.toastService.showSuccess(
        TOASTER_MESSAGES.ENTITY.COPY.SUCCESS(this.entityType, task.id),
      );
    } else {
      this.toastService.showError(
        TOASTER_MESSAGES.ENTITY.COPY.FAILURE(this.entityType, task.id),
      );
    }
  }

  ngOnInit() {
    this.store.dispatch(
      new SetCurrentConfig({
        ...this.config,
      }),
    );
    this.getLatestUserStories();
  }

  private formatTaskForView(acceptance: string | undefined): string | null {
    if (!acceptance) return null;
    return processTaskContentForView(acceptance, 180);
  }

  formatUserStoryDescriptionForView(
    description: string | undefined,
  ): string | null {
    if (!description) return null;
    return processUserStoryContentForView(description);
  }
}
