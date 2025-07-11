import { Component, inject, OnDestroy } from '@angular/core';
import {
  IUpdateUserStoryRequest,
  IUserStory,
} from '../../model/interfaces/IUserStory';
import { ProjectsState } from '../../store/projects/projects.state';
import { IList } from '../../model/interfaces/IList';

import { Store } from '@ngxs/store';
import { ActivatedRoute, Router } from '@angular/router';
import { FeatureService } from '../../services/feature/feature.service';
import {
  CreateNewUserStory,
  EditUserStory,
} from '../../store/user-stories/user-stories.actions';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { firstValueFrom } from 'rxjs';
import {
  AddBreadcrumb,
  DeleteBreadcrumb,
} from '../../store/breadcrumb/breadcrumb.actions';
import { NgClass, NgIf } from '@angular/common';
import { DialogService } from '../../services/dialog/dialog.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { AiChatComponent } from '../../components/ai-chat/ai-chat.component';
import { MultiUploadComponent } from '../../components/multi-upload/multi-upload.component';
import {
  CONFIRMATION_DIALOG,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { ArchiveUserStory } from '../../store/user-stories/user-stories.actions';
import { provideIcons } from '@ng-icons/core';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';
import { RichTextEditorComponent } from 'src/app/components/core/rich-text-editor/rich-text-editor.component';
import { ArchiveFile } from 'src/app/store/projects/projects.actions';
import { TestCaseUtilsService } from 'src/app/services/test-case/test-case-utils.service';

@Component({
  selector: 'app-edit-user-stories',
  templateUrl: './edit-user-stories.component.html',
  styleUrls: ['./edit-user-stories.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    InputFieldComponent,
    TextareaFieldComponent,
    NgIf,
    ButtonComponent,
    AiChatComponent,
    MultiUploadComponent,
    MatTooltipModule,
    RichTextEditorComponent
  ],
  providers: [
    provideIcons({ 
      heroSparklesSolid
    })
  ]
})
export class EditUserStoriesComponent implements OnDestroy {
  projectId: string = '';
  folderName: string = '';
  fileName: string = '';
  entityType: string = 'US';
  name: string = '';
  description: string = '';
  mode: string | null = 'edit';
  message: string = '';
  data: IUserStory = { description: '', id: '', name: '' };
  absoluteFilePath: string = '';
  userStories: IUserStory = {
    description: '',
    id: '',
    name: '',
    chatHistory: [],
    pmoId: '',
  };
  loading: boolean = false;
  uploadedFileContent = '';

  userStoryForm!: FormGroup;
  existingUserForm: IUserStory = { description: '', id: '', name: '' };
  response: IList = {} as IList;
  fileData: any = {};
  destroy$ = new Subject<boolean>();
  selectedProject!: string;
  projectMetadata: any;
  chatHistory: any = [];
  logger = inject(NGXLogger);
  appSystemService = inject(AppSystemService);
  activatedRoute = inject(ActivatedRoute);
  userStoryId: string | null = '';
  editLabel: string = '';
  allowForceRedirect: boolean = false;
  selectedProject$ = this.store.select(ProjectsState.getSelectedProject);
  selectedPRD: any = {};
  readonly dialogService = inject(DialogService);
  selectedFileContent$ = this.store.select(
    ProjectsState.getSelectedFileContent,
  );
  readonly regex = /\-feature.json$/;

  constructor(
    private store: Store,
    private featureService: FeatureService,
    private router: Router,
    private toasterService: ToasterService,
    private testCaseUtilsService: TestCaseUtilsService,
  ) {
    this.mode = this.activatedRoute.snapshot.paramMap.get('mode');
    const navigation = this.router.getCurrentNavigation();
    this.userStoryId = this.activatedRoute.snapshot.paramMap.get('userStoryId');
    this.folderName = navigation?.extras?.state?.['folderName'];
    this.fileName = navigation?.extras?.state?.['fileName'];
    this.fileData = navigation?.extras?.state?.['fileData'];
    this.absoluteFilePath = `${this.folderName}/${this.fileName}`;
    this.selectedPRD = navigation?.extras?.state?.['req'];
    if (this.mode === 'edit') {
      this.data = navigation?.extras?.state?.['data'];
      this.userStories = navigation?.extras?.state?.['data'];
      this.name = this.data?.name;
      this.description = this.data?.description;
      this.chatHistory = this.data?.chatHistory || [];
    }

    this.selectedProject$
      .pipe(takeUntil(this.destroy$))
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.selectedProject = res;
        if (res) {
          this.readMetadata(res).then();
        }
      });
    this.createUserStoryForm();
    this.editLabel = this.mode == 'edit' ? 'Edit' : 'Add';
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.editLabel,
      }),
    );
  }

  async readMetadata(rootProject: string) {
    this.projectMetadata =
      await this.appSystemService.readMetadata(rootProject);
    console.log(this.projectMetadata, 'projectMetadata');
  }

  updateUserStoryWithAI() {
    const body: IUpdateUserStoryRequest = {
      name: this.projectMetadata.name,
      description: this.projectMetadata.description,
      appId: this.projectMetadata.appId,
      reqId: this.fileName.replace(this.regex, ''),
      reqDesc: this.selectedPRD.requirement,
      featureId: this.existingUserForm.id,
      featureRequest: this.userStoryForm.getRawValue().description,
      contentType: '',
      fileContent: this.uploadedFileContent,
      useGenAI: true,
      existingFeatureTitle: this.existingUserForm.name,
      existingFeatureDesc: this.existingUserForm.description,
    };
    this.featureService.updateUserStory(body)
      .then((data) => {
        const featuresResponse: any = data;
        const matchingFeature = featuresResponse.features.find(
          (feature: { id: string }) => feature.id === this.data.id,
        );

        if (matchingFeature) {
          const featureName = Object.keys(matchingFeature).find(
            (key) => key !== 'id',
          );
          const featureDescription = matchingFeature[featureName!];
          this.store.dispatch(
            new EditUserStory(this.absoluteFilePath, {
              description: featureDescription,
              name: featureName!,
              id: this.data.id,
              pmoId: this.data.pmoId,
              chatHistory: this.chatHistory,
            }),
          );
          this.userStoryForm.patchValue({
            name: featureName,
            description: featureDescription
          });
          this.name = featureName!;
          this.description = featureDescription;
          this.toasterService.showSuccess(
            TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
              this.entityType,
              this.existingUserForm.id,
            ),
          );
        } else {
          console.log('No matching feature found for the given ID.');
        }
        this.userStoryForm.markAsUntouched();
        this.userStoryForm.markAsPristine();
      })
      .catch((error) => {
        console.error('Error updating requirement:', error);
        this.toasterService.showError(
          TOASTER_MESSAGES.ENTITY.UPDATE.FAILURE(
            this.entityType,
            this.existingUserForm.id,
          ),
        );
      });
  }

  updateUserStory() {
    if (
      this.userStoryForm.getRawValue().expandAI ||
      this.uploadedFileContent.length > 0
    ) {
      this.updateUserStoryWithAI();
    } else {
      this.store.dispatch(
        new EditUserStory(this.absoluteFilePath, {
          description: this.userStoryForm.getRawValue().description,
          name: this.userStoryForm.getRawValue().name,
          id: this.data.id,
          chatHistory: this.chatHistory,
        }),
      );

      this.userStoryForm.markAsUntouched();
      this.userStoryForm.markAsPristine();
      this.toasterService.showSuccess(
        TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
          this.entityType,
          this.existingUserForm.id,
        ),
      );
    }
  }

  addUserStory(useAI = false) {
    if (
      this.userStoryForm.getRawValue().expandAI ||
      useAI ||
      this.uploadedFileContent.length > 0
    ) {
      const body: IUpdateUserStoryRequest = {
        name: this.projectMetadata.name,
        description: this.projectMetadata.description,
        appId: this.projectMetadata.appId,
        reqId: this.fileName.replace(this.regex, ''),
        reqDesc: this.selectedPRD.requirement,
        featureId: 'US-NEW',
        featureRequest: this.userStoryForm.getRawValue().description,
        contentType: '',
        fileContent: this.uploadedFileContent,
        useGenAI: true,
      };
      this.featureService.addUserStory(body).then(
        (data) => {
          const featuresResponse: any = data;
          const matchingFeature = featuresResponse.features.find(
            (feature: { id: string }) => feature.id === 'US-NEW',
          );
          if (matchingFeature) {
            const featureName = Object.keys(matchingFeature).find(
              (key) => key !== 'id',
            );
            const featureDescription = matchingFeature[featureName!];
            this.store.dispatch(
              new CreateNewUserStory(
                {
                  name: featureName!,
                  description: featureDescription,
                },
                this.absoluteFilePath,
              ),
            );
            this.allowForceRedirect = true;
            this.navigateBackToUserStories();
            this.toasterService.showSuccess(
              TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.entityType),
            );
          } else {
            console.log('No matching feature found for the given ID.');
          }
        },
        (error) => {
          console.error('Error updating requirement:', error);
          this.toasterService.showError(
            TOASTER_MESSAGES.ENTITY.ADD.FAILURE(this.entityType),
          );
        },
      );
    } else {
      this.store.dispatch(
        new CreateNewUserStory(
          {
            name: this.userStoryForm.getRawValue().name,
            description: this.userStoryForm.getRawValue().description,
          },
          this.absoluteFilePath,
        ),
      );
      this.allowForceRedirect = true;
      this.navigateBackToUserStories();
      this.toasterService.showSuccess(
        TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.entityType),
      );
    }
  }

  navigateBackToUserStories() {
    this.router.navigate(['/user-stories', this.folderName], {
      state: {
        id: this.projectId,
        folderName: this.folderName,
        fileName: this.fileName.replace(this.regex, '-base.json'),
        data: this.fileData,
        req: this.selectedPRD,
      },
    });
  }

  updateContent(data: any) {
    let { chat, chatHistory } = data;
    if (chat.contentToAdd) {
      this.userStoryForm.patchValue({
        description: `${this.userStoryForm.getRawValue().description} ${chat.contentToAdd}`,
      });
      let newArray = chatHistory.map((item: any) => {
        if (item.name == chat.tool_name && item.tool_call_id == chat.tool_call_id) return { ...item, isAdded: true };
        else return item;
      });
      this.chatHistory = newArray;
      this.updateUserStoryWithAI();
    }
  }

  updateChatHistory(data: any) {
    this.store.dispatch(
      new EditUserStory(this.absoluteFilePath, {
        description: this.userStoryForm.getRawValue().description,
        name: this.userStoryForm.getRawValue().name,
        id: this.data.id,
        chatHistory: data.map((item: any) =>
          item.assistant && item.isLiked !== undefined
            ? { ...item, isLiked: item.isLiked }
            : item,
        ),
      }),
    );
  }

  createUserStoryForm() {
    this.userStoryForm = new FormGroup({
      name: new FormControl('', Validators.compose([Validators.required])),
      description: new FormControl(
        '',
        Validators.compose([Validators.required]),
      ),
      expandAI: new FormControl(false),
    });
    if (this.mode === 'edit') {
      this.existingUserForm.description = this.description;
      this.existingUserForm.name = this.name;
      this.existingUserForm.id = this.data.id;
      this.userStoryForm.patchValue({
        name: this.name,
        description: this.description,
      });
    }
  }

  private async checkForLinkedTestCases(userStoryId: string): Promise<boolean> {
    return this.testCaseUtilsService.checkForLinkedTestCases(this.selectedProject, userStoryId);
  }

  private async deleteTestCasesForUserStory(userStoryId: string): Promise<void> {
    await this.testCaseUtilsService.deleteTestCasesForUserStory(this.selectedProject, userStoryId);
    this.logger.debug(`Deleted test cases for user story ${userStoryId}`);
  }

  async deleteUserStory() {
    try {
      const hasLinkedTestCases = await this.checkForLinkedTestCases(this.existingUserForm.id);
      
      let dialogConfig = {
        title: CONFIRMATION_DIALOG.DELETION.TITLE,
        description: CONFIRMATION_DIALOG.DELETION.DESCRIPTION(this.existingUserForm.id),
        cancelButtonText: CONFIRMATION_DIALOG.DELETION.CANCEL_BUTTON_TEXT,
        confirmButtonText: CONFIRMATION_DIALOG.DELETION.PROCEED_BUTTON_TEXT,
      };
      
      if (hasLinkedTestCases) {
        dialogConfig.description = `${this.existingUserForm.id} has linked test cases that will also be deleted. Are you sure you want to proceed?`;
      }
      
      const confirmed = await firstValueFrom(this.dialogService.confirm(dialogConfig));
      
      if (confirmed) {
        if (hasLinkedTestCases) {
          await this.deleteTestCasesForUserStory(this.existingUserForm.id);
        }
        
        this.store.dispatch(
          new ArchiveUserStory(
            this.absoluteFilePath,
            this.existingUserForm.id,
          ),
        );
        
        this.navigateBackToUserStories();
        this.toasterService.showSuccess(
          TOASTER_MESSAGES.ENTITY.DELETE.SUCCESS(
            this.entityType,
            this.existingUserForm.id,
          ),
        );
      }
    } catch (error) {
      this.logger.error(`Error deleting user story ${this.existingUserForm.id}:`, error);
      this.toasterService.showError(
        TOASTER_MESSAGES.ENTITY.DELETE.FAILURE(this.entityType, this.existingUserForm.id),
      );
    }
  }

  enhanceUserStoryWithAI(){
    switch(this.mode){
      case "edit":{
        this.updateUserStoryWithAI();
        break;
      }
      case "add":{
        this.addUserStory(true);
        break;
      }
    }
  }

  handleFileContent(content: string) {
    this.uploadedFileContent = content;
  }

  canDeactivate(): boolean {
    return (
      !this.allowForceRedirect &&
      this.userStoryForm.dirty &&
      this.userStoryForm.touched
    );
  }

  ngOnDestroy(): void {
    this.store.dispatch(new DeleteBreadcrumb(this.editLabel));
  }
}
