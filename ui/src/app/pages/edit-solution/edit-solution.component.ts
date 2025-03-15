import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsState } from '../../store/projects/projects.state';
import { Store } from '@ngxs/store';
import {
  CreateFile,
  ArchiveFile,
  ReadFile,
  UpdateFile,
  checkBPFileAssociations,
} from '../../store/projects/projects.actions';
import { getDescriptionFromInput } from '../../utils/common.utils';
import {
  IAddRequirementRequest,
  IUpdateRequirementRequest,
} from '../../model/interfaces/IRequirement';
import { FeatureService } from '../../services/feature/feature.service';
import { IList } from '../../model/interfaces/IList';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AddBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';
import { NgClass, NgIf } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { AiChatComponent } from '../../components/ai-chat/ai-chat.component';
import { MultiUploadComponent } from '../../components/multi-upload/multi-upload.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { ErrorMessageComponent } from '../../components/core/error-message/error-message.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import {
  CONFIRMATION_DIALOG,
  ERROR_MESSAGES,
  FOLDER_REQUIREMENT_TYPE_MAP,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { catchError, switchMap, take } from 'rxjs';
import { RequirementTypeEnum } from 'src/app/model/enum/requirement-type.enum';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';
import { RichTextEditorComponent } from 'src/app/components/core/rich-text-editor/rich-text-editor.component';
import { processPRDContentForEdit } from "../../utils/prd.utils";

@Component({
  selector: 'app-edit-solution',
  templateUrl: './edit-solution.component.html',
  styleUrls: ['./edit-solution.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    NgIf,
    MatMenuModule,
    ReactiveFormsModule,
    InputFieldComponent,
    TextareaFieldComponent,
    ButtonComponent,
    AiChatComponent,
    MultiUploadComponent,
    NgIconComponent,
    ErrorMessageComponent,
    MatTooltipModule,
    RichTextEditorComponent
  ],
  providers: [
    provideIcons({ 
      heroSparklesSolid
    })
  ]
})
export class EditSolutionComponent {
  projectId: string = '';
  folderName: string = '';
  fileName: string = '';
  name: string = '';
  description: string = '';
  content: string = '';
  title: string = '';
  uploadedFileContent = '';
  mode: 'edit' | 'add' = 'edit';
  message: string = '';
  data: any = {};
  generateLoader: boolean = false;
  initialData: any = {};
  selectedRequirement: any = {};
  absoluteFilePath: string = '';
  oldContent: string = '';
  public loading: boolean = false;
  selectedFileContent$ = this.store.select(
    ProjectsState.getSelectedFileContent,
  );
  requirementForm!: FormGroup;
  response: IList = {} as IList;
  chatHistory: any = [];
  allowFreeRedirection: boolean = false;

  constructor(
    private store: Store,
    private router: Router,
    private featureService: FeatureService,
    private dialog: MatDialog,
    private toastService: ToasterService,
  ) {
    const url = this.router.url;
    this.mode = url.includes('/add') ? 'add' : 'edit';
    const navigation = this.router.getCurrentNavigation();
    this.projectId = navigation?.extras?.state?.['id'];
    this.folderName = navigation?.extras?.state?.['folderName'];
    this.initialData = navigation?.extras?.state?.['data'];
    this.selectedRequirement = navigation?.extras?.state?.['req'];
    this.store.dispatch(
      new AddBreadcrumb({
        url: `/apps/${this.projectId}`,
        label: this.folderName,
        state: {
          data: this.initialData,
          selectedFolder: {
            title: this.folderName,
            id: this.projectId,
            metadata: this.initialData,
          },
        },
      }),
    );
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.mode === 'edit' ? 'Edit' : 'Add',
      }),
    );
    if (this.mode === 'edit') {
      this.fileName = navigation?.extras?.state?.['fileName'];
      this.absoluteFilePath = `${this.folderName}/${this.fileName}`;
      this.name = this.initialData?.name;
      this.description = this.initialData?.description;
    }
    this.createRequirementForm();
  }

  updateRequirementWithAI() {
    const body: IUpdateRequirementRequest = {
      updatedReqt: this.requirementForm.getRawValue().title,
      addReqtType: this.folderName,
      fileContent: this.uploadedFileContent,
      contentType: this.uploadedFileContent ? 'fileContent' : 'userContent',
      id: this.initialData.id,
      reqId: this.fileName.replace(/\-base.json$/, ''),
      reqDesc: this.requirementForm.getRawValue().content,
      name: this.initialData.name,
      description: this.initialData.description,
      useGenAI: true,
    };
    this.featureService.updateRequirement(body).subscribe(
      (data) => {
        this.store.dispatch(
          new UpdateFile(this.absoluteFilePath, {
            requirement: data.updated.requirement,
            title: data.updated.title,
            chatHistory: this.chatHistory,
            epicTicketId: this.initialData.epicTicketId,
          }),
        );
        this.allowFreeRedirection = true;
        this.store.dispatch(
          new ReadFile(`${this.folderName}/${this.fileName}`),
        );
        this.selectedFileContent$.subscribe((res: any) => {
          this.oldContent = res.requirement;
          this.requirementForm.patchValue({
            title: res.title,
            content: res.requirement,
            epicticketid: res.epicTicketId,
          });
          this.chatHistory = res.chatHistory || [];
        });
        this.toastService.showSuccess(
          TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(body.addReqtType, data.reqId),
        );
      },
      (error) => {
        console.error('Error updating requirement:', error); // Handle any errors
        this.toastService.showError(
          TOASTER_MESSAGES.ENTITY.UPDATE.FAILURE(this.folderName, body.reqId),
        );
      },
    );
  }

  updateRequirement() {
    this.store.dispatch(
      new UpdateFile(this.absoluteFilePath, {
        requirement: this.requirementForm.getRawValue().content,
        title: this.requirementForm.getRawValue().title,
        chatHistory: this.chatHistory,
        epicTicketId: this.initialData.epicTicketId,
      }),
    );
    this.allowFreeRedirection = true;
    this.store.dispatch(new ReadFile(`${this.folderName}/${this.fileName}`));
    this.selectedFileContent$.subscribe((res: any) => {
      this.oldContent = res.requirement;
      this.requirementForm.patchValue({
        title: res.title,
        epicticketid: res.epicTicketId,
      });
      this.chatHistory = res.chatHistory || [];
    });
    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
        this.folderName,
        this.fileName.replace(/\-base.json$/, ''),
      ),
    );
  }

  navigateBackToDocumentList(data: any) {
    this.router.navigate(['/apps', this.projectId], {
      state: {
        data,
        selectedFolder: {
          title: this.folderName,
          id: this.projectId,
          metadata: data,
        },
      },
    });
  }

  addRequirement(useAI = false) {
    if (
      this.requirementForm.getRawValue().expandAI ||
      useAI ||
      this.uploadedFileContent.length > 0
    ) {
      const body: IAddRequirementRequest = {
        reqt: this.requirementForm.getRawValue().content,
        addReqtType: this.folderName,
        contentType: this.uploadedFileContent ? 'fileContent' : 'userContent',
        description: this.initialData.description,
        fileContent: this.uploadedFileContent,
        id: this.initialData.id,
        name: this.initialData.name,
        title: this.requirementForm.getRawValue().title,
        useGenAI: true,
      };
      this.featureService.addRequirement(body).subscribe(
        (data) => {
          this.store.dispatch(
            new CreateFile(`${this.folderName}`, {
              requirement: data.LLMreqt.requirement,
              title: data.LLMreqt.title,
              chatHistory: this.chatHistory,
            }),
          );
          this.allowFreeRedirection = true;
          this.navigateBackToDocumentList(this.initialData);
          this.toastService.showSuccess(
            TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(
              this.folderName,
            ),
          );
        },
        (error) => {
          console.error('Error updating requirement:', error); // Handle any errors
          this.toastService.showError(
            TOASTER_MESSAGES.ENTITY.ADD.FAILURE(
              this.folderName,
            ),
          );
        },
      );
    } else {
      this.store.dispatch(
        new CreateFile(`${this.folderName}`, {
          requirement: this.requirementForm.getRawValue().content,
          title: this.requirementForm.getRawValue().title,
          chatHistory: this.chatHistory,
        }),
      );
      this.allowFreeRedirection = true;
      this.navigateBackToDocumentList(this.initialData);
      this.toastService.showSuccess(
        TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(
          this.folderName,
        ),
      );
    }
  }

  appendRequirement(data: any) {
    let { chat, chatHistory } = data;
    if (chat.assistant) {
      this.requirementForm.patchValue({
        content: `${this.requirementForm.get('content')?.value}
${chat.assistant}`,
      });
      let newArray = chatHistory.map((item: any) => {
        if (item.assistant == chat.assistant) return { ...item, isAdded: true };
        else return item;
      });
      this.chatHistory = newArray;
      this.updateRequirementWithAI()
    }
  }

  enhanceRequirementWithAI(){
    switch(this.mode){
      case "edit":{
        this.updateRequirementWithAI();
        break;
      }
      case "add":{
        this.addRequirement(true);
        break;
      }
    }
  }

  updateChatHistory(chatHistory: any) {
    this.store.dispatch(
      new UpdateFile(this.absoluteFilePath, {
        requirement: this.requirementForm.get('content')?.value,
        title: this.requirementForm.get('title')?.value,
        chatHistory,
      }),
    );
  }

  createRequirementForm() {
    this.requirementForm = new FormGroup({
      title: new FormControl('', Validators.compose([Validators.required])),
      content: new FormControl('', Validators.compose([Validators.required])),
      expandAI: new FormControl(false),
    });
    if (this.mode === 'edit') {
      this.store.dispatch(new ReadFile(`${this.folderName}/${this.fileName}`));
      this.selectedFileContent$.subscribe((res: any) => {
        this.oldContent = res.requirement;
        // const processedContent = this.folderName === FOLDER_REQUIREMENT_TYPE_MAP[REQUIREMENT_TYPE.PRD] 
        //   ? processPRDContentForEdit(res.requirement)
        //   : res.requirement;
        this.requirementForm.patchValue({
          title: res.title,
          content: res.requirement,
          epicticketid: res.epicTicketId,
        });
        this.chatHistory = res.chatHistory || [];
      });
    }
  }

  deleteFile() {
    const reqId = this.fileName.replace(/\-base.json$/, '');

    if (
      this.folderName === RequirementTypeEnum.PRD ||
      this.folderName === RequirementTypeEnum.BRD
    ) {
      this.store
        .dispatch(new checkBPFileAssociations(this.folderName, this.fileName))
        .pipe(
          switchMap(() =>
            this.store
              .select(ProjectsState.getBpAssociationStatus)
              .pipe(take(1)),
          ),
          catchError(() => {
            this.toastService.showError(
              TOASTER_MESSAGES.ENTITY.DELETE.FAILURE(this.folderName, reqId),
            );
            return [];
          }),
        )
        .subscribe((res) => {
          if (res.isAssociated) {
            this.toastService.showWarning(
              ERROR_MESSAGES.DELETE_ASSOCIATED_ERROR(reqId, res.bpIds),
            );
            return;
          }

          this.promptFileDeletion(reqId);
        });
    } else {
      this.promptFileDeletion(reqId);
    }
  }

  private promptFileDeletion(reqId: string) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: CONFIRMATION_DIALOG.DELETION.TITLE,
        description: CONFIRMATION_DIALOG.DELETION.DESCRIPTION(reqId),
        cancelButtonText: CONFIRMATION_DIALOG.DELETION.CANCEL_BUTTON_TEXT,
        proceedButtonText: CONFIRMATION_DIALOG.DELETION.PROCEED_BUTTON_TEXT,
      },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res === false) {
        this.store.dispatch(new ArchiveFile(this.absoluteFilePath));
        this.allowFreeRedirection = true;
        this.navigateBackToDocumentList(this.initialData);
        this.toastService.showSuccess(
          TOASTER_MESSAGES.ENTITY.DELETE.SUCCESS(this.folderName, reqId),
        );
      }
    });
  }

  handleFileContent(content: string) {
    this.uploadedFileContent = content;
  }

  getDescription(input: string | undefined): string | null {
    return getDescriptionFromInput(input);
  }

  canDeactivate(): boolean {
    return (
      !this.allowFreeRedirection &&
      this.requirementForm.dirty &&
      this.requirementForm.touched
    );
  }
}
