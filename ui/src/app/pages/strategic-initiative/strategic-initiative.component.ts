import {
  exportMarkdownToDocx,
  WordFileExtension,
} from '../../utils/markdown.utils';
import {
  SectionInfo,
  parseMarkdownSections,
} from '../../utils/section.utils';
import { Component, OnInit, inject } from '@angular/core';
import { InlineEditModule } from '../../directives/inline-edit/inline-edit.module';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import {
  CreateFile,
  ArchiveFile,
  ReadFile,
  UpdateFile,
} from '../../store/projects/projects.actions';
import { AddBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';
import {
  FormControl,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import {
  AsyncPipe,
  NgClass,
  NgForOf,
  NgIf,
  CommonModule,
} from '@angular/common';
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
import {
  heroSparklesSolid,
  heroDocumentTextSolid,
} from '@ng-icons/heroicons/solid';
import { heroChevronLeft, heroChevronRight, heroLink, heroTrash } from '@ng-icons/heroicons/outline';
import { RichTextEditorComponent } from 'src/app/components/core/rich-text-editor/rich-text-editor.component';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { Observable, Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { IList } from '../../model/interfaces/IList';
import { ElectronService } from '../../electron-bridge/electron.service';
import {
  IAddStrategicInitiativeRequest,
} from '../../model/interfaces/strategic-initiative.interface';
import {
  WorkflowType,
  WorkflowProgressEventType,
} from '../../model/interfaces/workflow-progress.interface';
import { WorkflowProgressService } from '../../services/workflow-progress/workflow-progress.service';
import { WorkflowProgressDialogComponent } from '../../components/workflow-progress/workflow-progress-dialog/workflow-progress-dialog.component';
import {
  CanvasEditorComponent,
  EditProposal,
} from '../../components/core/canvas-editor/canvas-editor.component';
import { DocumentUpdateService } from 'src/app/services/document-update/document-update.service';
import { RequirementTypeEnum } from 'src/app/model/enum/requirement-type.enum';

@Component({
  selector: 'app-strategic-initiative',
  templateUrl: './strategic-initiative.component.html',
  styleUrls: ['./strategic-initiative.component.scss'],
  standalone: true,
  imports: [
    ButtonComponent,
    ReactiveFormsModule,
    FormsModule,
    MatMenuModule,
    InputFieldComponent,
    NgIf,
    NgForOf,
    NgClass,
    AiChatComponent,
    ExpandDescriptionPipe,
    NgIconComponent,
    RichTextEditorComponent,
    CommonModule,
    WorkflowProgressDialogComponent,
    CanvasEditorComponent,
    InlineEditModule,
  ],
  providers: [
    provideIcons({
      heroSparklesSolid,
      heroDocumentTextSolid,
      heroLink,
      heroTrash,
      heroChevronLeft,
      heroChevronRight
    }),
  ],
})
export class StrategicInitiativeComponent implements OnInit {
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
  workflowProgress: { title: string; timestamp: number }[] = [];
  currentWorkflowStep: string = '';
  isGeneratingStrategicInitiative: boolean = false;
  strategicInitiativeGenerationComplete: boolean = false;
  showProgressDialog: boolean = false;
  protected readonly WorkflowType = WorkflowType;
  private destroy$ = new Subject<void>();
  selectedUCFileContent$ = this.store.select(
    ProjectsState.getSelectedFileContent,
  );
  strategicInitiativeForm!: FormGroup;
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
  selectedSection: SectionInfo | null = null;
  documentSections: SectionInfo[] = [];
  isChatExpanded: boolean = true;

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private loggerService: NGXLogger,
    private electronService: ElectronService,
    private workflowProgressService: WorkflowProgressService,
    private documentUpdateService: DocumentUpdateService,
  ) {

    this.route.params.subscribe((params) => {
      this.mode = params['mode'] === 'add' ? 'add' : 'edit';
      this.fileName = params['fileName'] || '';
    });

    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.data = navigation.extras.state['data'] || {};
      this.projectId = navigation.extras.state['id'] || '';
      this.folderName = navigation.extras.state['folderName'] || '';
      this.selectedRequirement = navigation.extras.state['req'] || {};
    }

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

    if (this.mode === 'edit') {
      this.absoluteFilePath = `${this.folderName}/${this.fileName}`;
      this.name = this.data?.name;
      this.requirement = this.data?.description;
      this.ucRequirementId = this.fileName.split('-')[0];

      this.editLabel = `Edit ${this.ucRequirementId}`;
    } else {
      this.editLabel = 'Add';
    }

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

    this.initializeStrategicInitiativeForm();

    if (this.projectId) {
      this.showProgressDialog = false;
      this.isGeneratingStrategicInitiative = false;
      this.strategicInitiativeGenerationComplete = false;
    }
  }

  private handleStrategicInitiativeCreation(fileData: IAddStrategicInitiativeRequest) {
    const formattedData = {
      title: fileData.title,
      requirement: fileData.requirement,
      chatHistory: fileData.chatHistory,
      status: fileData.status,
      researchUrls: fileData.researchUrls
    };

    this.store.dispatch(new CreateFile(`${this.folderName}`, formattedData));

    this.allowForceRedirect = true;
    this.navigateBackToDocumentList(this.data);
    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.folderName),
    );
  }

  addStrategicInitiative() {
    const formValue = this.strategicInitiativeForm.getRawValue();

    const strategicInitiativeData: IAddStrategicInitiativeRequest = {
      title: formValue.title,
      requirement: formValue.requirement,
      requirementAbbr: RequirementTypeEnum.SI,
      chatHistory: this.chatHistory,
      status: 'DRAFT',
      researchUrls: formValue.researchUrls,
    };


    if (this.projectId) {
      this.showProgressDialog = false;
      this.isGeneratingStrategicInitiative = false;
      this.strategicInitiativeGenerationComplete = false;
    }

    this.handleStrategicInitiativeCreation(strategicInitiativeData);
  }

  updateStrategicInitiative() {
    const formValue = this.strategicInitiativeForm.getRawValue();

    const updatedData = {
      title: formValue.title,
      requirement: formValue.requirement,
      chatHistory: this.chatHistory,
      status: formValue.status,
      researchUrls: formValue.researchUrls,
    };

    this.store.dispatch(new UpdateFile(this.absoluteFilePath, updatedData));

    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
        this.folderName,
        this.ucRequirementId,
      ),
    );

    this.strategicInitiativeForm.markAsUntouched();
    this.strategicInitiativeForm.markAsPristine();
  }

  initializeStrategicInitiativeForm() {
    this.strategicInitiativeForm = new FormGroup({
      title: new FormControl('', Validators.compose([Validators.required])),
      requirement: new FormControl(
        '',
        Validators.compose([Validators.required]),
      ),
      status: new FormControl('DRAFT'),
      researchUrls: new FormArray([
        new FormControl('', [
          Validators.pattern('^https?://[a-zA-Z0-9-_.]+\\.[a-zA-Z0-9-_.]+.*$')
        ]),
      ]),
    });

    if (this.mode === 'edit') {
      this.store.dispatch(new ReadFile(`${this.folderName}/${this.fileName}`));
      this.selectedUCFileContent$.subscribe((res: any) => {
        if (!res) return;

        this.oldContent = res.requirement;
        this.chatHistory = res.chatHistory || [];

        this.strategicInitiativeForm.patchValue({
          title: res.title,
          requirement: res.requirement,
          status: res.status,
          researchUrls: res.researchUrls
        });
      });
    }
  }

  ngOnInit() {
    if (this.projectId) {
      this.workflowProgressService
        .getCreationStatusObservable(this.projectId, WorkflowType.StrategicInitiative)
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
          const wasGenerating = this.isGeneratingStrategicInitiative;
          this.isGeneratingStrategicInitiative = status.isCreating;
          this.strategicInitiativeGenerationComplete = status.isComplete;

          this.showProgressDialog = status.isCreating || status.isComplete;
          if (wasGenerating && !status.isCreating && status.isComplete) {
            this.resetStrategicInitiativeProgress();
          }
        });
    }
    
    if (this.mode === 'edit') {
      this.updateDocumentSections();
    }
    
    this.clearStaleData();
  }
  
  private clearStaleData(): void {
    if (this.mode === 'add') {
      this.chatHistory = [];
    }
    
    this.documentSections = [];
    this.selectedSection = null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.projectId) {
      this.workflowProgressService.clearCreationStatus(
        this.projectId,
        WorkflowType.StrategicInitiative,
      );
      this.workflowProgressService.clearProgressEvents(
        this.projectId,
        WorkflowType.StrategicInitiative,
      );
    }
    
    if (this.electronService.electronAPI) {
      try {
        this.workflowProgressService.removeGlobalListener(
          this.projectId,
          WorkflowType.StrategicInitiative
        );
      } catch (error) {
      }
    }
  }

  closeProgressDialog(): void {
    this.showProgressDialog = false;

    if (this.projectId) {
      this.workflowProgressService.clearCreationStatus(
        this.projectId,
        WorkflowType.StrategicInitiative,
      );

      this.workflowProgressService.clearProgressEvents(
        this.projectId,
        WorkflowType.StrategicInitiative,
      );
    }
  }

  private resetStrategicInitiativeProgress(): void {
    if (!this.projectId) return;

    this.workflowProgressService.removeGlobalListener(
      this.projectId,
      WorkflowType.StrategicInitiative,
    );
  }

  navigateBackToDocumentList(data: any) {
    if (this.projectId) {
      this.showProgressDialog = false;
      this.isGeneratingStrategicInitiative = false;
      this.strategicInitiativeGenerationComplete = false;
    }

    this.router
      .navigate(['/apps', this.projectId], {
        state: {
          data,
          selectedFolder: {
            title: this.folderName,
            id: this.projectId,
            metadata: data,
          },
        },
      })
      .then();
  }

  updateChatHistory(chatHistory: any) {
    this.chatHistory = chatHistory;

    this.processDocumentUpdates();

    if (this.mode === 'edit') {
      this.store.dispatch(
        new UpdateFile(this.absoluteFilePath, {
          title: this.strategicInitiativeForm.get('title')?.value,
          requirement: this.strategicInitiativeForm.get('requirement')?.value,
          status: this.strategicInitiativeForm.get('status')?.value,
          requirementAbbr: 'SI',
          chatHistory: chatHistory,
        }),
      );
    }
  }

  private processDocumentUpdates(): void {
    const toolMessages = this.chatHistory.filter(
      (message: any) => message.tool,
    );

    if (toolMessages.length > 0) {
      for (const message of toolMessages) {
        if (message.processed) continue;
        const handled = this.documentUpdateService.handleToolResponse(
          message.tool,
          (updatedContent: string, replacementInfo?: any) => {
            this.strategicInitiativeForm.patchValue({
              requirement: updatedContent,
            });

            this.updateDocumentSections();

            if (this.mode === 'edit') {
              this.updateStrategicInitiative();
            }
          },
          () => this.strategicInitiativeForm.get('requirement')?.value || '',
        );

        if (handled) {
          message.processed = true;
        }
      }
    }
  }

  deleteStrategicInitiative() {
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
    return !this.strategicInitiativeForm.valid;
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  finalizeStrategicInitiative() {
    if (
      this.mode === 'edit' &&
      this.strategicInitiativeForm.get('status')?.value === 'DRAFT'
    ) {
      this.strategicInitiativeForm.patchValue({
        status: 'COMPLETE',
      });
      this.updateStrategicInitiative();
    }
  }

  exportAsWord() {
    const title = this.strategicInitiativeForm.get('title')?.value || 'Business Proposal';
    const markdownContent = this.strategicInitiativeForm.get('requirement')?.value || '';

    exportMarkdownToDocx(markdownContent, title, {
      fileExtension: WordFileExtension.DOCX,
    })
      .then(() => {
        this.toastService.showSuccess(
          'Business proposal exported successfully as Word document',
        );
      })
      .catch((error) => {
        console.error('Error exporting document:', error);
        this.toastService.showError(
          `Failed to export document: ${error.message}`,
        );
      });
  }

  canDeactivate(): boolean {
    return this.allowForceRedirect && !this.strategicInitiativeForm.dirty;
  }

  get researchUrlsFormArray(): FormArray {
    return this.strategicInitiativeForm.get('researchUrls') as FormArray;
  }

  addResearchUrl() {
    this.researchUrlsFormArray.push(
      new FormControl('', [
        Validators.pattern('^https?://[a-zA-Z0-9-_.]+\\.[a-zA-Z0-9-_.]+.*$')
      ]),
    );
  }

  removeResearchUrl(index: number) {
    this.researchUrlsFormArray.removeAt(index);
  }

  async generateStrategicInitiativeDraft() {
    this.setupStrategicInitiativeProgressListener();

    this.showProgressDialog = true;
    this.isGeneratingStrategicInitiative = true;
    this.strategicInitiativeGenerationComplete = false;

    await this.workflowProgressService.setCreating(
      this.projectId,
      WorkflowType.StrategicInitiative,
    );

    try {
      const formValue = this.strategicInitiativeForm.getRawValue();

      const researchUrls = formValue.researchUrls.filter(
        (url: string) => url.trim() !== '',
      );

      const requestData = {
        project: {
          name: this.folderName,
          description: this.data?.description || '',
          solution: {
            solutionId: this.projectId,
            name: this.data?.name || '',
            description: this.data?.description || '',
            techDetails: this.data?.technicalDetails || '',
          },
        },
        requirement: {
          title: formValue.title,
          description: formValue.requirement || '',
          researchUrls: researchUrls,
        },
      };

      console.log(
        'Sending request to generate business proposal:',
        requestData,
      );

      const result = await this.electronService.generateStrategicInitiative(requestData);

      console.log(
        'Received response from business proposal generation:',
        result,
      );

      if (result && result.status === 'success') {
        this.workflowProgressService.addProgressEvent(
          this.projectId,
          WorkflowType.StrategicInitiative,
          {
            node: 'generate-strategic-initiative',
            type: WorkflowProgressEventType.Action,
            message: {
              title: 'Business proposal generated successfully',
              input: undefined,
              output: { title: result.title },
            },
            timestamp: Date.now(),
          },
        );

        this.strategicInitiativeForm.patchValue({
          title: result.title || formValue.title,
          requirement: result.requirement,
        });

        this.toastService.showSuccess(
          'Business proposal generated successfully',
        );

        this.showProgressDialog = false;

        this.mode === 'add' ? this.addStrategicInitiative() : this.updateStrategicInitiative();
      } else {
        console.error('Failed to generate business proposal:', result);
        this.toastService.showError(
          'Failed to generate business proposal. Please try again.',
        );
      }
    } catch (error) {
      console.error('Error generating business proposal:', error);
      this.toastService.showError(
        'An error occurred while generating the business proposal',
      );

      await this.workflowProgressService.setFailed(
        this.projectId,
        WorkflowType.StrategicInitiative,
        {
          timestamp: new Date().toISOString(),
          reason: String(error),
        },
      );
    }
  }

  onCanvasContentChange(content: string): void {
    this.strategicInitiativeForm.patchValue({
      requirement: content,
    });
  }


  onTitleChange(title: string): void {
    this.strategicInitiativeForm.patchValue({
      title: title,
    });
  }

  onSectionSelected(section: SectionInfo): void {
    this.selectedSection = section;
    this.loggerService.debug('Selected section:', section);
  }

  selectDocumentSection(section: SectionInfo): void {
    this.selectedSection = section;

    const canvasEditor = document.querySelector('app-canvas-editor');
    if (
      canvasEditor &&
      typeof (canvasEditor as any).selectSection === 'function'
    ) {
      (canvasEditor as any).selectSection(section.id);
    }

    this.loggerService.debug('Selected document section:', section);
  }

  /**
   * Toggle the expanded state of the chat panel
   */
  toggleChatExpanded(): void {
    this.isChatExpanded = !this.isChatExpanded;

    // When the chat is expanded, we should update the document sections
    if (this.isChatExpanded) {
      // Parse the content to extract sections
      this.updateDocumentSections();
    }
  }

  private updateDocumentSections(): void {
    const content = this.strategicInitiativeForm.get('requirement')?.value || '';

    this.documentSections = parseMarkdownSections(content);

    if (this.selectedSection) {
      const stillExists = this.documentSections.some(
        (s) => s.id === this.selectedSection?.id,
      );
      if (!stillExists && this.documentSections.length > 0) {
        this.selectedSection = this.documentSections[0];
      }
    }
  }

  private setupStrategicInitiativeProgressListener(): void {
    if (!this.projectId) return;

    if (
      !this.workflowProgressService.hasGlobalListener(
        this.projectId,
        WorkflowType.StrategicInitiative,
      )
    ) {
      this.workflowProgressService.registerGlobalListener(
        this.projectId,
        WorkflowType.StrategicInitiative,
      );
    }

    this.workflowProgressService.clearProgressEvents(
      this.projectId,
      WorkflowType.StrategicInitiative,
    );
  }
  
  getDocumentContext = (): string => {
    return this.strategicInitiativeForm.get('requirement')?.value || '';
  }
  
  handleInlineEdit = (newContent: string): void => {
    this.onCanvasContentChange(newContent);
    
    if (this.mode === 'edit') {
      this.updateStrategicInitiative();
    }
    
    this.updateDocumentSections();
  }
}
