import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import {
  BulkReadFiles,
  CreateFile,
  ArchiveFile,
  ReadFile,
  UpdateFile,
} from '../../store/projects/projects.actions';
import { AddBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { LoadingService } from '../../services/loading.service';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { AsyncPipe, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { PillComponent } from '../../components/pill/pill.component';
import { AiChatComponent } from '../../components/ai-chat/ai-chat.component';
import { ExpandDescriptionPipe } from '../../pipes/expand-description.pipe';
import { TruncateEllipsisPipe } from '../../pipes/truncate-ellipsis-pipe';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { NGXLogger } from 'ngx-logger';
import {
  CONFIRMATION_DIALOG,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { heroSparklesSolid, heroDocumentTextSolid } from '@ng-icons/heroicons/solid';
import { heroLink, heroTrash } from '@ng-icons/heroicons/outline';
import { RichTextEditorComponent } from 'src/app/components/core/rich-text-editor/rich-text-editor.component';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { Observable } from 'rxjs';
import { IList } from '../../model/interfaces/IList';
import { ElectronService } from '../../electron-bridge/electron.service';
import { IAddUseCaseRequest, IUpdateUseCaseRequest, ContextItem } from '../../model/interfaces/IUseCase';

@Component({
  selector: 'app-use-case',
  templateUrl: './use-case.component.html',
  styleUrls: ['./use-case.component.scss'],
  standalone: true,
  imports: [
    ButtonComponent,
    ReactiveFormsModule,
    FormsModule,
    MatMenuModule,
    InputFieldComponent,
    TextareaFieldComponent,
    NgIf,
    NgForOf,
    NgClass,
    AsyncPipe,
    AiChatComponent,
    ExpandDescriptionPipe,
    TruncateEllipsisPipe,
    NgIconComponent,
    RichTextEditorComponent,
    CommonModule,
    PillComponent,
  ],
  providers: [
    provideIcons({
      heroSparklesSolid,
      heroDocumentTextSolid,
      heroLink,
      heroTrash
    }),
  ],
})
export class UseCaseComponent implements OnInit {
  projectId: string = '';
  folderName: string = '';
  fileName: string = '';
  name: string = '';
  requirement: string = '';
  content: string = '';
  title: string = '';
  mode: 'edit' | 'add' = 'edit';
  data: any = {};
  selectedRequirement: any = {};
  absoluteFilePath: string = '';
  oldContent: string = '';
  allowForceRedirect: boolean = false;
  public loading: boolean = false;
  selectedUCFileContent$ = this.store.select(
    ProjectsState.getSelectedFileContent,
  );
  useCaseForm!: FormGroup;
  response: IList = {} as IList;
  editLabel: string = '';
  ucRequirementId: string = '';
  requirementTypes: any = REQUIREMENT_TYPE;
  readonly dialogService = inject(DialogService);
  activeTab: string = 'chat';
  protected readonly JSON = JSON;
  toastService = inject(ToasterService);

  originalDocumentList$: Observable<IList[]> = this.store.select(
    ProjectsState.getSelectedFileContents,
  );

  chatHistory: any = [];
  contextItems: ContextItem[] = [];
  urlInput: string = '';
  fileInput: any = null;
  showUrlDialog: boolean = false;

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private loadingService: LoadingService,
    private loggerService: NGXLogger,
    private electronService: ElectronService
  ) {
    // Get mode from route parameters
    this.route.params.subscribe(params => {
      this.mode = params['mode'] === 'add' ? 'add' : 'edit';
      this.fileName = params['fileName'] || '';
    });

    // Get state data if available
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.data = navigation.extras.state['data'] || {};
      this.projectId = navigation.extras.state['id'] || '';
      this.folderName = navigation.extras.state['folderName'] || '';
      this.selectedRequirement = navigation.extras.state['req'] || {};
    }

    // Set up breadcrumbs
    this.store.dispatch(
      new AddBreadcrumb({
        url: `/apps/${this.projectId}`,
        label: this.folderName,
        state: {
          data: this.data,
          selectedFolder: {
            title: this.folderName,
            id: this.projectId,
            metadata: this.data,
          },
        },
      }),
    );
    
    this.editLabel = this.mode == 'edit' ? 'Edit' : 'Add';
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.editLabel,
        url: this.router.url,
        state: {
          data: this.data,
          id: this.projectId,
          folderName: this.folderName,
          fileName: this.fileName,
          req: this.selectedRequirement,
        },
      }),
    );
    
    if (this.mode === 'edit') {
      this.absoluteFilePath = `${this.folderName}/${this.fileName}`;
      this.name = this.data?.name;
      this.requirement = this.data?.description; // Access description from data but store in requirement
      this.ucRequirementId = this.fileName.split('-')[0];
    }
    
    this.initializeUseCaseForm();
  }

  private handleUseCaseCreation(fileData: IAddUseCaseRequest) {
    this.loadingService.setLoading(true);
    
    // Format the data for the CreateFile action to match the expected format
    // The document listing component expects 'requirement' and 'title' fields
    const formattedData = {
      requirement: fileData.requirement,
      title: fileData.title,
      context: fileData.context,
      chatHistory: fileData.chatHistory,
      status: fileData.status
    };
    
    // Create the use case using the store action with properly formatted data
    this.store.dispatch(
      new CreateFile(`${this.folderName}`, formattedData)
    );
    
    this.allowForceRedirect = true;
    this.navigateBackToDocumentList(this.data);
    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.folderName),
    );
    this.loadingService.setLoading(false);
  }

  addUseCase() {
    const formValue = this.useCaseForm.getRawValue();
    
    // Create the use case data
    const useCaseData: IAddUseCaseRequest = {
      title: formValue.title,
      requirement: formValue.requirement,
      requirementAbbr: 'UC',
      context: this.contextItems,
      chatHistory: this.chatHistory,
      status: 'DRAFT'
    };

    this.handleUseCaseCreation(useCaseData);
  }

  updateUseCase() {
    const formValue = this.useCaseForm.getRawValue();
    this.loadingService.setLoading(true);

    const useCaseData: IUpdateUseCaseRequest = {
      id: this.ucRequirementId,
      title: formValue.title,
      requirement: formValue.requirement,
      requirementAbbr: 'UC',
      context: this.contextItems,
      chatHistory: this.chatHistory,
      status: formValue.status
    };

    const formattedData = {
      requirement: formValue.requirement, 
      title: formValue.title,
      context: this.contextItems,
      chatHistory: this.chatHistory,
      status: formValue.status
    };

    this.store.dispatch(
      new UpdateFile(this.absoluteFilePath, formattedData)
    );
    
    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
        this.folderName,
        this.ucRequirementId,
      ),
    );
    
    this.useCaseForm.markAsUntouched();
    this.useCaseForm.markAsPristine();
    this.loadingService.setLoading(false);
  }

  initializeUseCaseForm() {
    this.useCaseForm = new FormGroup({
      title: new FormControl('', Validators.compose([Validators.required])),
      requirement: new FormControl('', Validators.compose([Validators.required])),
      status: new FormControl('DRAFT')
    });
    
    if (this.mode === 'edit') {
      this.store.dispatch(new ReadFile(`${this.folderName}/${this.fileName}`));
      this.selectedUCFileContent$.subscribe((res: any) => {
        if (!res) return;
        
        this.oldContent = res.requirement;
        this.contextItems = res.context || [];
        this.chatHistory = res.chatHistory || [];
        
        this.useCaseForm.patchValue({
          title: res.title,
          requirement: res.requirement,
          status: res.status
        });
      });
    }
  }

  ngOnInit() {
    // Nothing specific needed on init
  }

  navigateBackToDocumentList(data: any) {
    this.router
      .navigate(['/apps', this.projectId], {
        state: {
          data,
          selectedFolder: {
            title: this.folderName,
            id: this.projectId,
            metadata: data,
          },
        }
      })
      .then();
  }

  updateChatHistory(chatHistory: any) {
    this.chatHistory = chatHistory;
    if (this.mode === 'edit') {
      this.store.dispatch(
        new UpdateFile(this.absoluteFilePath, {
          ...this.useCaseForm.getRawValue(),
          requirementAbbr: 'UC',
          context: this.contextItems,
          chatHistory: chatHistory,
        }),
      );
    }
  }

  appendRequirement(data: any) {
    let { chat, chatHistory } = data;
    if (chat.contentToAdd) {
      this.useCaseForm.patchValue({
        requirement: `${this.useCaseForm.get('requirement')?.value} ${chat.contentToAdd}`,
      });
      
      // Mark the content as added in chat history
      let newArray = chatHistory.map((item: any) => {
        if (item.name == chat.tool_name && item.tool_call_id == chat.tool_call_id) {
          return { ...item, isAdded: true };
        } else {
          return item;
        }
      });
      
      if (this.mode === 'edit') {
        this.store.dispatch(
          new UpdateFile(this.absoluteFilePath, {
            ...this.useCaseForm.getRawValue(),
            requirementAbbr: 'UC',
            context: this.contextItems,
            chatHistory: newArray,
          }),
        );
        this.updateUseCase();
      } else {
        this.chatHistory = newArray;
      }
    }
  }

  deleteUseCase() {
    this.dialogService
      .confirm({
        title: CONFIRMATION_DIALOG.DELETION.TITLE,
        description: CONFIRMATION_DIALOG.DELETION.DESCRIPTION(
          this.ucRequirementId,
        ),
        cancelButtonText: CONFIRMATION_DIALOG.DELETION.CANCEL_BUTTON_TEXT,
        confirmButtonText: CONFIRMATION_DIALOG.DELETION.PROCEED_BUTTON_TEXT,
      })
      .subscribe((res) => {
        if (res) {
          this.store.dispatch(new ArchiveFile(this.absoluteFilePath));
          this.navigateBackToDocumentList(this.data);
          this.toastService.showSuccess(
            TOASTER_MESSAGES.ENTITY.DELETE.SUCCESS(
              this.folderName,
              this.ucRequirementId,
            ),
          );
        }
      });
  }

  checkFormValidity(): boolean {
    return !this.useCaseForm.valid;
  }

  // Context panel methods
  addUrlContext() {
    if (this.urlInput && this.urlInput.trim()) {
      this.contextItems.push({
        type: 'url',
        source: this.urlInput.trim()
      });
      
      this.urlInput = '';
      
      if (this.mode === 'edit') {
        this.updateContextInFile();
      }
    }
  }
  
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      // In a real implementation, you would upload the file to the server
      // For now, we'll just add it to the context items
      this.contextItems.push({
        type: 'docx',
        source: file.name
      });
      
      if (this.mode === 'edit') {
        this.updateContextInFile();
      }
    } else {
      this.toastService.showError('Please select a valid .docx file');
    }
  }

  removeContextItem(index: number) {
    this.contextItems.splice(index, 1);
    
    if (this.mode === 'edit') {
      this.updateContextInFile();
    }
  }
  
  updateContextInFile() {
    this.store.dispatch(
      new UpdateFile(this.absoluteFilePath, {
        ...this.useCaseForm.getRawValue(),
        requirementAbbr: 'UC',
        context: this.contextItems,
        chatHistory: this.chatHistory,
      }),
    );
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  finalizeUseCase() {
    if (this.mode === 'edit' && this.useCaseForm.get('status')?.value === 'DRAFT') {
      this.useCaseForm.patchValue({
        status: 'COMPLETE'
      });
      this.updateUseCase();
    }
  }

  canDeactivate(): boolean {
    // Return true to allow navigation only if there are no changes or force redirect is allowed
    return !this.allowForceRedirect && this.useCaseForm.dirty;
  }

  // URL Dialog methods
  addUrlPrompt() {
    this.showUrlDialog = true;
    this.urlInput = '';
  }

  cancelUrlDialog() {
    this.showUrlDialog = false;
    this.urlInput = '';
  }
}
