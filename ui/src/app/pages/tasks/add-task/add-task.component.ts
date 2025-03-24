import { Component, inject, OnDestroy } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import {
  CreateNewTask,
  SetCurrentTaskId,
  UpdateTask,
} from '../../../store/user-stories/user-stories.actions';
import { ProjectsState } from '../../../store/projects/projects.state';
import { Subject, takeUntil } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { UserStoriesState } from '../../../store/user-stories/user-stories.state';
import { FeatureService } from '../../../services/feature/feature.service';
import { AppSystemService } from '../../../services/app-system/app-system.service';
import {
  IAddTaskRequest,
  IEditTaskRequest,
} from '../../../model/interfaces/ITask';
import {
  AddBreadcrumb,
  DeleteBreadcrumb,
} from '../../../store/breadcrumb/breadcrumb.actions';
import { NgClass, NgIf } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InputFieldComponent } from '../../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../../components/core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../../../components/core/button/button.component';
import { AiChatComponent } from '../../../components/ai-chat/ai-chat.component';
import { MultiUploadComponent } from '../../../components/multi-upload/multi-upload.component';
import { ErrorMessageComponent } from '../../../components/core/error-message/error-message.component';
import { ArchiveTask } from '../../../store/user-stories/user-stories.actions';
import {
  CONFIRMATION_DIALOG,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from 'src/app/constants/app.constants';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { provideIcons } from '@ng-icons/core';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';
import { RichTextEditorComponent } from 'src/app/components/core/rich-text-editor/rich-text-editor.component';
import { RequirementIdService } from 'src/app/services/requirement-id.service';

@Component({
  selector: 'app-add-task',
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    InputFieldComponent,
    TextareaFieldComponent,
    ButtonComponent,
    NgIf,
    AiChatComponent,
    MultiUploadComponent,
    ErrorMessageComponent,
    MatTooltipModule,
    RichTextEditorComponent
  ],
  providers: [
    provideIcons({
      heroSparklesSolid,
    }),
  ],
})
export class AddTaskComponent implements OnDestroy {
  mode: 'edit' | 'add' = 'edit';
  taskForm!: FormGroup;
  selectedProject!: string;
  prd: any = {};
  config!: {
    projectId: string;
    fileName: string;
    folderName: string;
    reqId: string;
    featureId: string;
    featureName?: string;
    newFileName?: string;
  };
  uploadedFileContent: string = '';

  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  store = inject(Store);
  logger = inject(NGXLogger);
  appSystemService = inject(AppSystemService);
  featureService = inject(FeatureService);
  selectedProject$ = this.store.select(ProjectsState.getSelectedProject);
  destroy$ = new Subject<boolean>();
  projectMetadata: any;
  chatHistory: any = [];
  editLabel: string = '';
  userStory: any = {};
  entityType: string = 'TASK';
  absoluteFilePath: string = '';

  existingTask: {
    id: string;
    acceptance: string;
    task: string;
    subTaskTicketId: string;
  } = {
    id: '',
    acceptance: '',
    task: '',
    subTaskTicketId: '',
  };

  constructor(
    private dialog: MatDialog,
    private toastService: ToasterService,
    private requirementIdService: RequirementIdService,
  ) {
    this.mode = this.activatedRoute.snapshot.paramMap.get('mode') as
      | 'edit'
      | 'add';
    this.getConfig();
    const taskId = this.activatedRoute.snapshot.paramMap.get('taskId');
    const userStoryId =
      this.activatedRoute.snapshot.paramMap.get('userStoryId');
    this.selectedProject$.pipe(takeUntil(this.destroy$)).subscribe((res) => {
      this.selectedProject = res;
      if (res) {
        this.readMetadata(res).then();
      }
    });

    this.store.select(ProjectsState.getSelectedFileContent).subscribe((res) => {
      this.prd = res;
    });

    this.store
      .select(UserStoriesState.getSelectedUserStory)
      .subscribe((res) => {
        this.userStory = res;
      });

    this.createTaskForm(taskId);
    this.editLabel = this.mode == 'edit' ? 'Edit' : 'Add';

    this.store.dispatch(
      new AddBreadcrumb({
        label: this.config.featureId + ' - Tasks',
        tooltipLabel: `Tasks of ${this.config.featureId}: ${this.config.featureName}`,
        url: `/task-list/${userStoryId}`,
        state: { config: this.config },
      }),
    );
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.editLabel,
      }),
    );

    if (this.mode === 'edit') {
      this.absoluteFilePath = `${this.config.folderName}/${this.config.newFileName}`;
    }
  }

  getConfig() {
    this.store.select(UserStoriesState.getCurrentConfig).subscribe((config) => {
      if (config) {
        this.config = config;
      }
      this.logger.debug(config, 'config', this.config);
    });
  }

  async readMetadata(rootProject: string) {
    this.logger.debug('root project: ', rootProject);
    this.projectMetadata =
      await this.appSystemService.readMetadata(rootProject);
    this.logger.debug(this.projectMetadata);
  }

  responseFormatter(data: any) {
    if (typeof data == 'object') return data.join('. ');
    else return data;
  }

  createTaskForm(taskId: string | null) {
    this.taskForm = new FormGroup({
      list: new FormControl('', Validators.compose([Validators.required])),
      acceptance: new FormControl(
        '',
        Validators.compose([Validators.required]),
      ),
      id: new FormControl(taskId),
      useGenAI: new FormControl(false),
      fileContent: new FormControl(''),
      subTaskTicketId: new FormControl(''),
    });
    if (taskId) {
      this.store.dispatch(new SetCurrentTaskId(taskId));
      this.store.select(UserStoriesState.getSelectedTask).subscribe((task) => {
        this.chatHistory = task?.chatHistory || [];
        this.existingTask.id = <string>task?.id;
        this.existingTask.acceptance = <string>task?.acceptance;
        this.existingTask.task = <string>task?.list;
        this.existingTask.subTaskTicketId = <string>task?.subTaskTicketId;
        this.taskForm.patchValue({
          id: task?.id,
          acceptance: task?.acceptance,
          list: task?.list,
          subTaskTicketId: task?.subTaskTicketId,
        });
      });
    } else {
      const nextTaskId = this.requirementIdService.getNextRequirementId(
        REQUIREMENT_TYPE.TASK,
      );

      this.requirementIdService
        .updateRequirementCounters({
          [REQUIREMENT_TYPE.TASK]: nextTaskId,
        })
        .then();

      this.taskForm.patchValue({
        id: `TASK${nextTaskId}`,
      });
    }
  }

  addTask(useAI = false) {
    if (this.taskForm.valid) {
      this.logger.debug(this.config);
      const newFileName = this.config.fileName.replace('base', 'feature');
      this.logger.debug(this.taskForm.getRawValue());
      const data = this.taskForm.getRawValue();
      if (!data.useGenAI && this.uploadedFileContent.length === 0 && !useAI) {
        this.store.dispatch(
          new CreateNewTask(
            { id: data.id, list: data.list, acceptance: data.acceptance },
            `${this.selectedProject}/${this.config.folderName}/${newFileName}`,
          ),
        );

        this.taskForm.markAsUntouched();
        this.taskForm.markAsPristine();
        this.navigateBackToTasks();
        this.toastService.showSuccess(
          TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.entityType),
        );
      } else {
        this.addTaskWithAI(data.id, data.list, data.acceptance, newFileName);
      }
    }
  }

  updateTask() {
    if (this.taskForm.valid) {
      const newFileName = this.config.fileName.replace('base', 'feature');
      this.logger.debug(this.taskForm.getRawValue());
      const data = this.taskForm.getRawValue();
      if (!data.useGenAI && this.uploadedFileContent.length === 0) {
        this.store.dispatch(
          new UpdateTask(
            {
              ...this.taskForm.getRawValue(),
              chatHistory: this.chatHistory,
              subTaskTicketId: this.existingTask.subTaskTicketId,
            },
            `${this.selectedProject}/${this.config.folderName}/${newFileName}`,
          ),
        );
        this.taskForm.markAsUntouched();
        this.taskForm.markAsPristine();
        this.toastService.showSuccess(
          TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
            this.entityType,
            this.existingTask.id,
          ),
        );
      } else {
        this.editTaskWithAI();
      }
    }
  }

  updateTaskFromChat(data: any) {
    let { chat, chatHistory } = data;
    if (chat.assistant) {
      this.taskForm.patchValue({
        acceptance: `${this.taskForm.getRawValue().acceptance}
${chat.assistant}`,
        subTaskTicketId: this.existingTask.subTaskTicketId,
      });
      console.log(
        this.existingTask.subTaskTicketId,
        this.taskForm.getRawValue().subTaskTicketId,
        'subTaskTicketId',
      );
      let newArray = chatHistory.map((item: any) => {
        if (item.assistant == chat.assistant) return { ...item, isAdded: true };
        else return item;
      });
      this.chatHistory = newArray;
      this.editTaskWithAI();
    }
  }

  updateChatHistory(data: any) {
    const newFileName = this.config.fileName.replace('base', 'feature');
    this.store.dispatch(
      new UpdateTask(
        {
          ...this.taskForm.getRawValue(),
          chatHistory: data.map((item: any) =>
            item.assistant && item.isLiked !== undefined
              ? { ...item, isLiked: item.isLiked }
              : item,
          ),
        },
        `${this.selectedProject}/${this.config.folderName}/${newFileName}`,
        false,
      ),
    );
  }

  addTaskWithAI(
    id: string,
    list: string,
    acceptance: string,
    newFileName: string,
  ) {
    const requestData: IAddTaskRequest = {
      taskId: id,
      useGenAI: true,
      description: this.userStory.description,
      name: this.userStory.name,
      appId: this.projectMetadata.id,
      featureId: this.config.featureId,
      contentType: this.uploadedFileContent ? 'fileContent' : '',
      fileContent: this.uploadedFileContent,
      reqId: this.config.reqId,
      reqDesc: acceptance,
      usIndex: 0,
      taskName: list,
    };

    this.featureService.addTask(requestData).then((res) => {
      const taskEntry = res.tasks.find((task) => task.id === id);

      if (taskEntry) {
        const taskKey = Object.keys(taskEntry).find((key) => key !== 'id');

        if (taskKey) {
          const dispatchData = {
            id: id,
            list: taskKey,
            acceptance: this.responseFormatter(taskEntry[taskKey]),
          };
          this.store.dispatch(
            new CreateNewTask(
              dispatchData,
              `${this.selectedProject}/${this.config.folderName}/${newFileName}`,
            ),
          );
          this.taskForm.markAsUntouched();
          this.taskForm.markAsPristine();
          this.navigateBackToTasks();
          this.toastService.showSuccess(
            TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.entityType),
          );
        } else {
          this.logger.error('No task key found other than "id"');
        }
      } else {
        this.logger.error('Task with specified ID not found in the response');
      }
    });
  }

  navigateBackToTasks() {
    this.router
      .navigate(['/task-list', this.config.featureId], {
        state: {
          config: this.config,
        },
      })
      .then();
  }

  editTaskWithAI() {
    const data = this.taskForm.getRawValue();
    const newFileName = this.config.fileName.replace('base', 'feature');

    const requestBody: IEditTaskRequest = {
      name: this.userStory.name,
      description: this.userStory.description,
      appId: this.projectMetadata.id,
      taskId: data.id,
      featureId: this.config.featureId,
      reqId: this.config.reqId,
      contentType: this.uploadedFileContent ? 'fileContent' : '',
      fileContent: this.uploadedFileContent,
      reqDesc: data.acceptance,
      useGenAI: true,
      usIndex: 0,
      existingTaskDesc: this.existingTask.acceptance,
      existingTaskTitle: this.existingTask.task,
      taskName: data.list,
    };

    this.featureService.updateTask(requestBody).then((res) => {
      const taskEntry = res.tasks.find((task) => task.id === data.id);

      if (taskEntry) {
        const taskKey = Object.keys(taskEntry).find((key) => key !== 'id');

        if (taskKey) {
          const dispatchData = {
            id: data.id,
            list: taskKey,
            acceptance: this.responseFormatter(taskEntry[taskKey]),
            chatHistory: this.chatHistory,
            subTaskTicketId: this.existingTask.subTaskTicketId,
          };
          this.store.dispatch(
            new UpdateTask(
              dispatchData,
              `${this.selectedProject}/${this.config.folderName}/${newFileName}`,
            ),
          );
          this.taskForm.markAsUntouched();
          this.taskForm.markAsPristine();
          this.toastService.showSuccess(
            TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(this.entityType, data.id),
          );
        } else {
          this.logger.error('No task key found other than "id"');
        }
      } else {
        this.logger.error('Task with specified ID not found in the response');
      }
    });
  }

  enhanceTaskWithAI(){
    switch(this.mode){
      case "edit":{
        this.editTaskWithAI();
        break;
      }
      case "add":{
        this.addTask(true);
        break;
      }
    }
  }

  handleFileContent(content: string) {
    this.logger.debug(content);
    this.uploadedFileContent = content;
  }

  deleteTask() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: CONFIRMATION_DIALOG.DELETION.TITLE,
        description: CONFIRMATION_DIALOG.DELETION.DESCRIPTION(
          this.existingTask.id,
        ),
        cancelButtonText: CONFIRMATION_DIALOG.DELETION.CANCEL_BUTTON_TEXT,
        proceedButtonText: CONFIRMATION_DIALOG.DELETION.PROCEED_BUTTON_TEXT,
      },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (!res) {
        this.store.dispatch(
          new ArchiveTask(
            this.absoluteFilePath,
            this.config.featureId,
            this.existingTask.id,
          ),
        );
        this.navigateBackToTasks();
        this.toastService.showSuccess(
          TOASTER_MESSAGES.ENTITY.DELETE.SUCCESS(
            this.entityType,
            this.existingTask.id,
          ),
        );
      }
    });
  }

  ngOnDestroy() {
    this.store.dispatch(new DeleteBreadcrumb(this.editLabel));
    this.destroy$.next(false);
    this.destroy$.complete();
  }

  canDeactivate(): boolean {
    return this.taskForm.dirty && this.taskForm.touched;
  }
}
