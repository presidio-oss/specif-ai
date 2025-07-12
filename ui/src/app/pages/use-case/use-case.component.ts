import {
  exportMarkdownToDocx,
  WordFileExtension,
} from '../../utils/markdown.utils';
import {
  SectionInfo,
  parseMarkdownSections,
  generateSectionId,
  replaceSection,
  appendContent,
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
import { heroLink, heroTrash } from '@ng-icons/heroicons/outline';
import { RichTextEditorComponent } from 'src/app/components/core/rich-text-editor/rich-text-editor.component';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { Observable, Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { IList } from '../../model/interfaces/IList';
import { ElectronService } from '../../electron-bridge/electron.service';
import {
  IAddUseCaseRequest,
  IUpdateUseCaseRequest,
} from '../../model/interfaces/IUseCase';
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
import { FloatingChatComponent } from '../../components/core/floating-chat/floating-chat.component';
import { DocumentUpdateService } from 'src/app/services/document-update/document-update.service';
import { DocumentUpdateHandlerService } from 'src/app/services/document-update/document-update-handler.service';

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
    WorkflowProgressDialogComponent,
    CanvasEditorComponent,
    FloatingChatComponent,
    InlineEditModule,
  ],
  providers: [
    provideIcons({
      heroSparklesSolid,
      heroDocumentTextSolid,
      heroLink,
      heroTrash,
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
  workflowProgress: { title: string; timestamp: number }[] = [];
  currentWorkflowStep: string = '';
  isGeneratingUseCase: boolean = false;
  useCaseGenerationComplete: boolean = false;
  showProgressDialog: boolean = false;
  protected readonly WorkflowType = WorkflowType;
  private destroy$ = new Subject<void>();
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
  selectedSection: SectionInfo | null = null;
  documentSections: SectionInfo[] = [];
  isChatExpanded: boolean = true;

  // Document update handler
  private documentUpdateHandler: DocumentUpdateHandlerService;

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private loggerService: NGXLogger,
    private electronService: ElectronService,
    private workflowProgressService: WorkflowProgressService,
    private documentUpdateService: DocumentUpdateService,
  ) {
    // Initialize document update handler
    this.documentUpdateHandler = new DocumentUpdateHandlerService(
      documentUpdateService,
      this.toastService,
    );

    // Get mode from route parameters
    this.route.params.subscribe((params) => {
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

    // Set up first breadcrumb
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
      this.requirement = this.data?.description; // Access description from data but store in requirement
      this.ucRequirementId = this.fileName.split('-')[0];

      // Set edit label with ID after ID is initialized
      this.editLabel = `Edit ${this.ucRequirementId}`;
    } else {
      this.editLabel = 'Add';
    }

    // Set up second breadcrumb after ID is initialized
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

    this.initializeUseCaseForm();

    // Clear any existing workflow status
    if (this.projectId) {
      this.showProgressDialog = false;
      this.isGeneratingUseCase = false;
      this.useCaseGenerationComplete = false;
    }
  }

  private handleUseCaseCreation(fileData: IAddUseCaseRequest) {
    // Format the data for the CreateFile action to match the expected format
    // The document listing component expects 'title' and 'requirement' fields
    const formattedData = {
      title: fileData.title,
      requirement: fileData.requirement,
      chatHistory: fileData.chatHistory,
      status: fileData.status,
    };

    // Create the use case using the store action with properly formatted data
    this.store.dispatch(new CreateFile(`${this.folderName}`, formattedData));

    this.allowForceRedirect = true;
    this.navigateBackToDocumentList(this.data);
    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.folderName),
    );
  }

  addUseCase() {
    const formValue = this.useCaseForm.getRawValue();

    // Create the use case data
    const useCaseData: IAddUseCaseRequest = {
      title: formValue.title,
      requirement: formValue.requirement,
      requirementAbbr: 'UC',
      chatHistory: this.chatHistory,
      status: 'DRAFT',
    };

    // Clear workflow status before navigating away
    if (this.projectId) {
      this.showProgressDialog = false;
      this.isGeneratingUseCase = false;
      this.useCaseGenerationComplete = false;
    }

    this.handleUseCaseCreation(useCaseData);
  }

  updateUseCase() {
    const formValue = this.useCaseForm.getRawValue();

    const useCaseData: IUpdateUseCaseRequest = {
      id: this.ucRequirementId,
      title: formValue.title,
      requirement: formValue.requirement,
      requirementAbbr: 'UC',
      chatHistory: this.chatHistory,
      status: formValue.status,
    };

    const formattedData = {
      title: formValue.title,
      requirement: formValue.requirement,
      chatHistory: this.chatHistory,
      status: formValue.status,
    };

    this.store.dispatch(new UpdateFile(this.absoluteFilePath, formattedData));

    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
        this.folderName,
        this.ucRequirementId,
      ),
    );

    this.useCaseForm.markAsUntouched();
    this.useCaseForm.markAsPristine();
  }

  initializeUseCaseForm() {
    this.useCaseForm = new FormGroup({
      title: new FormControl('', Validators.compose([Validators.required])),
      requirement: new FormControl(
        '',
        Validators.compose([Validators.required]),
      ),
      status: new FormControl('DRAFT'),
      researchUrls: new FormArray([
        new FormControl('', Validators.pattern('https?://.+')),
      ]),
    });

    if (this.mode === 'edit') {
      this.store.dispatch(new ReadFile(`${this.folderName}/${this.fileName}`));
      this.selectedUCFileContent$.subscribe((res: any) => {
        if (!res) return;

        this.oldContent = res.requirement;
        this.chatHistory = res.chatHistory || [];

        this.useCaseForm.patchValue({
          title: res.title,
          requirement: res.requirement,
          status: res.status,
        });
      });
    }
  }

  ngOnInit() {
    if (this.projectId) {
      this.workflowProgressService
        .getCreationStatusObservable(this.projectId, WorkflowType.UseCase)
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
          const wasGenerating = this.isGeneratingUseCase;
          this.isGeneratingUseCase = status.isCreating;
          this.useCaseGenerationComplete = status.isComplete;

          this.showProgressDialog = status.isCreating || status.isComplete;
          if (wasGenerating && !status.isCreating && status.isComplete) {
            this.resetUseCaseProgress();
          }
        });
    }
    
    // Initialize document sections when component loads
    // This is important since chat is expanded by default
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
        WorkflowType.UseCase,
      );
      this.workflowProgressService.clearProgressEvents(
        this.projectId,
        WorkflowType.UseCase,
      );
    }
    
    if (this.electronService.electronAPI) {
      try {
        this.workflowProgressService.removeGlobalListener(
          this.projectId,
          WorkflowType.UseCase
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
        WorkflowType.UseCase,
      );

      this.workflowProgressService.clearProgressEvents(
        this.projectId,
        WorkflowType.UseCase,
      );
    }
  }

  private resetUseCaseProgress(): void {
    if (!this.projectId) return;

    this.workflowProgressService.removeGlobalListener(
      this.projectId,
      WorkflowType.UseCase,
    );
  }

  navigateBackToDocumentList(data: any) {
    // Clear workflow status before navigating away
    if (this.projectId) {
      this.showProgressDialog = false;
      this.isGeneratingUseCase = false;
      this.useCaseGenerationComplete = false;
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

    // Process the chat history for document updates
    this.processDocumentUpdates();

    if (this.mode === 'edit') {
      this.store.dispatch(
        new UpdateFile(this.absoluteFilePath, {
          title: this.useCaseForm.get('title')?.value,
          requirement: this.useCaseForm.get('requirement')?.value,
          status: this.useCaseForm.get('status')?.value,
          requirementAbbr: 'UC',
          chatHistory: chatHistory,
        }),
      );
    }
  }

  /**
   * Process the chat history for document updates
   * This method checks for tool responses in the chat history and applies document updates
   */
  private processDocumentUpdates(): void {
    // Check if there are any tool messages in the chat history
    const toolMessages = this.chatHistory.filter(
      (message: any) => message.tool,
    );

    if (toolMessages.length > 0) {
      // Process each tool message
      for (const message of toolMessages) {
        // Check if the message has already been processed
        if (message.processed) continue;

        // Try to handle the tool response
        const handled = this.documentUpdateHandler.handleToolResponse(
          message.tool,
          (updatedContent: string, replacementInfo?: any) => {
            // Update the form with the updated content
            this.useCaseForm.patchValue({
              requirement: updatedContent,
            });

            // Update the document sections
            this.updateDocumentSections();

            // If in edit mode, update the use case
            if (this.mode === 'edit') {
              this.updateUseCase();
            }

            // Handle visual highlighting if replacement info is provided
            if (replacementInfo) {
              this.highlightReplacement(replacementInfo);
            }
          },
          // Function to get the current content
          () => this.useCaseForm.get('requirement')?.value || '',
        );

        // Mark the message as processed
        if (handled) {
          message.processed = true;
        }
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

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  finalizeUseCase() {
    if (
      this.mode === 'edit' &&
      this.useCaseForm.get('status')?.value === 'DRAFT'
    ) {
      this.useCaseForm.patchValue({
        status: 'COMPLETE',
      });
      this.updateUseCase();
    }
  }

  /**
   * Export the business proposal as a Word document
   * Uses the utility function to convert markdown to Word format
   */
  exportAsWord() {
    const title = this.useCaseForm.get('title')?.value || 'Business Proposal';
    const markdownContent = this.useCaseForm.get('requirement')?.value || '';

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
    return !this.allowForceRedirect && this.useCaseForm.dirty;
  }

  /**
   * Generates a use case draft using the agentic flow
   * This method calls the backend API to generate a use case draft based on the project and requirement information
   */
  // Getter for the research URLs form array
  get researchUrlsFormArray(): FormArray {
    return this.useCaseForm.get('researchUrls') as FormArray;
  }

  // Add a new research URL field
  addResearchUrl() {
    this.researchUrlsFormArray.push(
      new FormControl('', Validators.pattern('https?://.+')),
    );
  }

  // Remove a research URL field
  removeResearchUrl(index: number) {
    this.researchUrlsFormArray.removeAt(index);
  }

  async generateUseCaseDraft() {
    // Setup workflow progress
    this.setupUseCaseProgressListener();

    // Show progress dialog immediately
    this.showProgressDialog = true;
    this.isGeneratingUseCase = true;
    this.useCaseGenerationComplete = false;

    await this.workflowProgressService.setCreating(
      this.projectId,
      WorkflowType.UseCase,
    );

    try {
      // Get the current form values
      const formValue = this.useCaseForm.getRawValue();

      // Filter out empty research URLs
      const researchUrls = formValue.researchUrls.filter(
        (url: string) => url.trim() !== '',
      );

      // Prepare the request data
      const requestData = {
        project: {
          name: this.folderName,
          description: this.data?.description || '',
          // Include solution metadata
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

      // Call the backend API to generate the use case draft
      const result = await this.electronService.generateUseCase(requestData);

      console.log(
        'Received response from business proposal generation:',
        result,
      );

      if (result && result.status === 'success') {
        // Add a completion event
        this.workflowProgressService.addProgressEvent(
          this.projectId,
          WorkflowType.UseCase,
          {
            node: 'generate-usecase',
            type: WorkflowProgressEventType.Action,
            message: {
              title: 'Business proposal generated successfully',
              input: undefined,
              output: { title: result.title },
            },
            timestamp: Date.now(),
          },
        );

        // Update the form with the generated content
        this.useCaseForm.patchValue({
          title: result.title || formValue.title,
          requirement: result.requirement,
        });

        this.toastService.showSuccess(
          'Business proposal generated successfully',
        );

        // Close the progress dialog immediately after successful generation
        this.showProgressDialog = false;

        // If in add mode, create the use case
        this.mode === 'add' && this.addUseCase();
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
        WorkflowType.UseCase,
        {
          timestamp: new Date().toISOString(),
          reason: String(error),
        },
      );
    }
  }

  // setupWorkflowProgressListener method removed - using setupUseCaseProgressListener instead

  /**
   * Handle content changes from the canvas editor
   * @param content The updated content
   */
  onCanvasContentChange(content: string): void {
    this.useCaseForm.patchValue({
      requirement: content,
    });
  }

  /**
   * Handle title changes from the canvas editor
   * @param title The updated title
   */
  onTitleChange(title: string): void {
    this.useCaseForm.patchValue({
      title: title,
    });
  }

  /**
   * Handle section selection in the canvas editor
   * @param section The selected section
   */
  onSectionSelected(section: SectionInfo): void {
    this.selectedSection = section;
    this.loggerService.debug('Selected section:', section);
  }

  /**
   * Handle edit proposals from the chat or canvas editor
   * Uses utility functions for section replacement and content appending
   * @param edit The proposed edit
   */
  onEditProposed(edit: EditProposal): void {
    try {
      const currentContent = this.useCaseForm.get('requirement')?.value || '';
      let updatedContent: string;

      // Determine how to apply the edit based on its type
      switch (edit.type) {
        case 'append':
          // Use the utility function to append content
          updatedContent = appendContent(currentContent, edit.content);
          this.useCaseForm.patchValue({ requirement: updatedContent });
          this.toastService.showSuccess(
            'Content added to the end of the document',
          );
          break;

        case 'section':
          // Replace a specific section if one is selected
          if (this.selectedSection) {
            // Use the utility function to replace the section
            updatedContent = replaceSection(
              currentContent,
              this.selectedSection,
              edit.content,
            );
            this.useCaseForm.patchValue({ requirement: updatedContent });
            this.toastService.showSuccess(
              `Updated section: ${this.selectedSection.title}`,
            );
          } else {
            this.toastService.showWarning(
              'No section selected. Please select a section to edit.',
            );
          }
          break;

        case 'full':
          // Replace the entire content
          this.useCaseForm.patchValue({ requirement: edit.content });
          this.toastService.showSuccess('Document content replaced');
          break;

        default:
          this.toastService.showError(`Unknown edit type: ${edit.type}`);
          return;
      }

      // If in edit mode, update the use case
      if (this.mode === 'edit') {
        this.updateUseCase();
      }

      // Update document sections after content changes
      this.updateDocumentSections();
    } catch (error) {
      console.error('Error applying edit:', error);
      this.toastService.showError('Failed to apply edit');
    }
  }

  /**
   * Select a document section from the sidebar
   * @param section The section to select
   */
  selectDocumentSection(section: SectionInfo): void {
    this.selectedSection = section;

    // If we have a canvas editor, tell it to select this section
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

  /**
   * Update the document sections based on the current content
   * Uses the utility function to parse markdown headings into sections
   */
  private updateDocumentSections(): void {
    const content = this.useCaseForm.get('requirement')?.value || '';

    // Use the utility function to parse sections
    this.documentSections = parseMarkdownSections(content);

    // If we have a selected section, make sure it's still valid after parsing
    if (this.selectedSection) {
      const stillExists = this.documentSections.some(
        (s) => s.id === this.selectedSection?.id,
      );
      if (!stillExists && this.documentSections.length > 0) {
        this.selectedSection = this.documentSections[0];
      }
    }
  }

  /**
   * Highlight the replaced text in the document
   * This is a simplified version that just shows a toast notification
   * @param replacementInfo Information about the replacement
   */
  private highlightReplacement(replacementInfo: any): void {
    // Show a toast notification with the replacement details
    if (replacementInfo.searchText && replacementInfo.replaceText) {
      this.toastService.showSuccess(
        `Replaced "${replacementInfo.searchText}" with "${replacementInfo.replaceText}"`,
      );
    } else if (
      replacementInfo.startPosition !== undefined &&
      replacementInfo.endPosition !== undefined
    ) {
      this.toastService.showSuccess(
        `Updated text at positions ${replacementInfo.startPosition}-${replacementInfo.endPosition}`,
      );
    }

    // Find the canvas editor component and tell it to focus on the updated section
    const canvasEditor = document.querySelector('app-canvas-editor');
    if (
      canvasEditor &&
      typeof (canvasEditor as any).refreshContent === 'function'
    ) {
      // If the canvas editor has a refreshContent method, call it to refresh the editor
      (canvasEditor as any).refreshContent();
    }
  }

  private setupUseCaseProgressListener(): void {
    console.log(
      "Krithiak here's my setupTaskProgressListener method",
      this.projectId,
    );
    if (!this.projectId) return;

    if (
      !this.workflowProgressService.hasGlobalListener(
        this.projectId,
        WorkflowType.UseCase,
      )
    ) {
      this.workflowProgressService.registerGlobalListener(
        this.projectId,
        WorkflowType.UseCase,
      );
    }

    this.workflowProgressService.clearProgressEvents(
      this.projectId,
      WorkflowType.UseCase,
    );
  }
  
  /**
   * Gets the document context for inline editing
   * This provides the full document content for better AI context
   */
  getDocumentContext = (): string => {
    return this.useCaseForm.get('requirement')?.value || '';
  }
  
  /**
   * Handles inline edit content updates
   * @param newContent The new content from inline edit
   */
  handleInlineEdit = (newContent: string): void => {
    this.onCanvasContentChange(newContent);
    
    // If in edit mode, update the use case
    if (this.mode === 'edit') {
      this.updateUseCase();
    }
    
    // Update document sections
    this.updateDocumentSections();
  }
}
