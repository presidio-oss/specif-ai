import { exportMarkdownToDocx, WordFileExtension } from '../../utils/markdown.utils';
import {
  SectionInfo,
  parseMarkdownSections,
  generateSectionId,
  replaceSection,
  appendContent,
} from '../../utils/section.utils';
import { Component, OnInit, inject } from '@angular/core';
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

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private loggerService: NGXLogger,
    private electronService: ElectronService,
    private workflowProgressService: WorkflowProgressService,
  ) {
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

    // Clear any existing workflow status
    if (this.projectId) {
      this.workflowProgressService.clearCreationStatus(
        this.projectId,
        WorkflowType.UseCase,
      );
      this.workflowProgressService.clearProgressEvents(
        this.projectId,
        WorkflowType.UseCase,
      );
      this.showProgressDialog = false;
      this.isGeneratingUseCase = false;
      this.useCaseGenerationComplete = false;
    }
  }

  private handleUseCaseCreation(fileData: IAddUseCaseRequest) {
    // Format the data for the CreateFile action to match the expected format
    // The document listing component expects 'requirement' and 'title' fields
    const formattedData = {
      requirement: fileData.requirement,
      title: fileData.title,
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
      this.workflowProgressService.clearCreationStatus(
        this.projectId,
        WorkflowType.UseCase,
      );
      this.workflowProgressService.clearProgressEvents(
        this.projectId,
        WorkflowType.UseCase,
      );
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
      requirement: formValue.requirement,
      title: formValue.title,
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  private setupUseCaseProgressListener(): void {
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

  navigateBackToDocumentList(data: any) {
    // Clear workflow status before navigating away
    if (this.projectId) {
      this.workflowProgressService.clearCreationStatus(
        this.projectId,
        WorkflowType.UseCase,
      );
      this.workflowProgressService.clearProgressEvents(
        this.projectId,
        WorkflowType.UseCase,
      );
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
    if (this.mode === 'edit') {
      this.store.dispatch(
        new UpdateFile(this.absoluteFilePath, {
          ...this.useCaseForm.getRawValue(),
          requirementAbbr: 'UC',
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
        if (
          item.name == chat.tool_name &&
          item.tool_call_id == chat.tool_call_id
        ) {
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
            chatHistory: newArray,
          }),
        );
        this.updateUseCase();
      } else {
        this.chatHistory = newArray;
      }

      // Show a toast message to indicate what happened
      this.toastService.showSuccess('Added content to requirement');
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

    exportMarkdownToDocx(markdownContent, title, { fileExtension: WordFileExtension.DOCX })
      .then(() => {
        this.toastService.showSuccess(
          'Business proposal exported successfully as Word document',
        );
      })
      .catch((error) => {
        console.error('Error exporting document:', error);
        this.toastService.showError(`Failed to export document: ${error.message}`);
      });
  }

  canDeactivate(): boolean {
    return !this.allowForceRedirect && this.useCaseForm.dirty;
  }

  /**
   * Generates a use case draft using the agentic flow
   * This method calls the backend API to generate a use case draft based on the project and requirement information
   */
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

    this.toastService.showInfo(
      'Generating business proposal... This may take a moment.',
    );

    try {
      // Get the current form values
      const formValue = this.useCaseForm.getRawValue();

      // Prepare the request data
      const requestData = {
        project: {
          name: this.folderName,
          description: this.data?.description || '',
          // Include solution metadata
          solution: {
            name: this.data?.name || '',
            description: this.data?.description || '',
            techDetails: this.data?.technicalDetails || '',
          },
        },
        requirement: {
          title: formValue.title,
          description: formValue.requirement || '',
        },
      };

      console.log(
        'Sending request to generate business proposal:',
        requestData,
      );

      // Add an initial thinking event to ensure the progress dialog shows something
      this.workflowProgressService.addProgressEvent(
        this.projectId,
        WorkflowType.UseCase,
        {
          node: 'generate-usecase',
          type: WorkflowProgressEventType.Thinking,
          message: {
            title: 'Starting business proposal generation...',
            input: undefined,
            output: undefined,
          },
          timestamp: Date.now(),
        },
      );

      // Call the backend API to generate the use case draft
      const result = await this.electronService.generateUseCase(requestData);

      console.log(
        'Received response from business proposal generation:',
        result,
      );

      // Set up listener for workflow progress events with the actual requestId
      if (result && (result as any).requestId) {
        this.setupWorkflowProgressListener((result as any).requestId);
      }

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

        // Clear workflow status
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

      // Add an error event
      this.workflowProgressService.addProgressEvent(
        this.projectId,
        WorkflowType.UseCase,
        {
          node: 'generate-usecase',
          type: WorkflowProgressEventType.Error,
          message: {
            title: 'Error generating business proposal',
            input: undefined,
            output: { error: String(error) },
          },
          timestamp: Date.now(),
        },
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

  /**
   * Sets up a listener for workflow progress events
   * @param requestId The ID of the request to listen for
   */
  private setupWorkflowProgressListener(requestId: string) {
    if (!this.projectId || !requestId) return;

    // Set up direct listener for the specific channel used in the API
    const channelName = `usecase:${requestId}-workflow-progress`;

    // Register global listener if not already registered
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

    // Set up listener for workflow progress events
    const workflowProgressCallback = (_: any, event: any) => {
      if (!event?.message?.title) return;

      // Update the current workflow step
      this.currentWorkflowStep = event.message.title;

      // Add the event to the workflow progress
      this.workflowProgress.push({
        title: event.message.title,
        timestamp: event.timestamp || Date.now(),
      });

      // Update the toast message with the current step
      this.toastService.showInfo(`Generating proposal: ${event.message.title}`);

      // Create a standardized progress event
      const progressEvent = {
        node: event.node || 'generate-usecase',
        type: event.type || WorkflowProgressEventType.Thinking,
        message: {
          title: event.message.title,
          input: event.message.input,
          output: event.message.output,
        },
        timestamp: event.timestamp || Date.now(),
        correlationId: event.correlationId,
      };

      // Update the workflow progress dialog
      this.workflowProgressService.addProgressEvent(
        this.projectId,
        WorkflowType.UseCase,
        progressEvent,
      );
    };

    // Set up listeners if the electron API is available
    if (this.electronService.electronAPI) {
      // Clean up any existing listeners to avoid duplicates
      this.cleanupWorkflowListeners(channelName, workflowProgressCallback);

      // Add the direct channel listener
      this.electronService.electronAPI.on(
        channelName,
        workflowProgressCallback,
      );

      // Also listen on the standard workflow progress channel
      this.electronService.listenWorkflowProgress(
        WorkflowType.UseCase,
        this.projectId,
        workflowProgressCallback,
      );

      // Set up automatic cleanup after 5 minutes to prevent memory leaks
      setTimeout(
        () =>
          this.cleanupWorkflowListeners(channelName, workflowProgressCallback),
        5 * 60 * 1000,
      );
    }
  }

  /**
   * Clean up workflow progress listeners to prevent memory leaks
   */
  private cleanupWorkflowListeners(channelName: string, callback: any): void {
    if (!this.electronService.electronAPI) return;

    try {
      // Remove the direct channel listener
      this.electronService.electronAPI.removeListener(channelName, callback);

      // Remove the standard workflow progress listener
      this.electronService.removeWorkflowProgressListener(
        WorkflowType.UseCase,
        this.projectId,
        callback,
      );
    } catch (error) {
      // Ignore errors if listeners don't exist
    }
  }

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
}
