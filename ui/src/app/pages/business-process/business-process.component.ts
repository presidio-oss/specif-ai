import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsState } from '../../store/projects/projects.state';
import { Store } from '@ngxs/store';
import {
  BulkReadFiles,
  CreateFile,
  ArchiveFile,
  ReadFile,
  UpdateFile,
  ClearBRDPRDState,
} from '../../store/projects/projects.actions';
import { FeatureService } from '../../services/feature/feature.service';
import { IList } from '../../model/interfaces/IList';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AddBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';
import { Observable } from 'rxjs';
import {
  IAddBusinessProcessRequest,
  IEnhanceBusinessProcessRequest,
  IEnhanceBusinessProcessResponse,
  IFlowChartRequest,
  IUpdateProcessRequest,
} from '../../model/interfaces/IBusinessProcess';
import { DocumentTypeMappingEnum, RequirementTypeEnum } from '../../model/enum/requirement-type.enum';
import { LoadingService } from '../../services/loading.service';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { AsyncPipe, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { PillComponent } from '../../components/pill/pill.component';
import { CheckboxCardComponent } from '../../components/checkbox-card/checkbox-card.component';
import { AiChatComponent } from '../../components/ai-chat/ai-chat.component';
import { ExpandDescriptionPipe } from '../../pipes/expand-description.pipe';
import { TruncateEllipsisPipe } from '../../pipes/truncate-ellipsis-pipe';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { NGXLogger } from 'ngx-logger';
import {
  CONFIRMATION_DIALOG,
  FOLDER_REQUIREMENT_TYPE_MAP,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';
import { RichTextEditorComponent } from 'src/app/components/core/rich-text-editor/rich-text-editor.component';
import { processPRDContentForView } from 'src/app/utils/prd.utils';
import { truncateMarkdown } from 'src/app/utils/markdown.utils';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { ElectronService } from 'src/app/electron-bridge/electron.service';
import { Document } from 'src/app/model/interfaces/projects.interface';

@Component({
  selector: 'app-business-process',
  templateUrl: './business-process.component.html',
  styleUrls: ['./business-process.component.scss'],
  standalone: true,
  imports: [
    ButtonComponent,
    ReactiveFormsModule,
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
    CheckboxCardComponent
  ],
  providers: [
    provideIcons({
      heroSparklesSolid,
    }),
  ],
})
export class BusinessProcessComponent implements OnInit {
  projectId: string = '';
  folderName: string = '';
  fileName: string = '';
  name: string = '';
  originalSelectedPRDs: number[] = [];
  originalSelectedBRDs: number[] = [];
  description: string = '';
  content: string = '';
  title: string = '';
  mode: 'edit' | 'add' = 'edit';
  data: any = {};
  selectedRequirement: any = {};
  absoluteFilePath: string = '';
  oldContent: string = '';
  allowForceRedirect: boolean = false;
  existingFlowDiagram: string = '';
  public loading: boolean = false;
  businessProcessForm!: FormGroup;
  response: IList = {} as IList;
  selectedPRDs: number[] = [];
  selectedBRDs: number[] = [];
  selectedTab: string = DocumentTypeMappingEnum.PRD;
  editLabel: string = '';
  bpRequirementId: string = '';
  requirementTypes: any = DocumentTypeMappingEnum;
  solutionId: number;
  businessProcessId: number;
  readonly dialogService = inject(DialogService);
  activeTab: string = 'includeFiles';
  protected readonly JSON = JSON;
  toastService = inject(ToasterService);
  electronService = inject(ElectronService);

  originalDocumentList: Document[] = [];

  chatHistory: any = [];

  removePRD(documentId: number): void {
    this.selectedPRDs = this.selectedPRDs.filter(
      (id) => id !== documentId
    );
    this.businessProcessForm.get('selectedPRDs')?.setValue(this.selectedPRDs);
    this.updateContentValidators();
    this.updateIncludePRDandBRDValidator();
  }

  removeBRD(documentId: number): void {
    this.selectedBRDs = this.selectedBRDs.filter(
      (id) => id !== documentId
    );
    this.businessProcessForm.get('selectedBRDs')?.setValue(this.selectedBRDs);
    this.updateContentValidators();
    this.updateIncludePRDandBRDValidator();
  }

  constructor(
    private store: Store,
    private router: Router,
    private featureService: FeatureService,
    private loadingService: LoadingService,
    private loggerService: NGXLogger,
  ) {
    const url = this.router.url;
    this.mode = url.includes('bp-add') ? 'add' : 'edit';
    const navigation = this.router.getCurrentNavigation();
    this.projectId = navigation?.extras?.state?.['id'];
    this.folderName = navigation?.extras?.state?.['folderName'];
    this.fileName = navigation?.extras?.state?.['fileName'];
    this.data = navigation?.extras?.state?.['data'];
    this.selectedRequirement = navigation?.extras?.state?.['req'];
    this.solutionId = navigation?.extras?.state?.['solutionId'];
    this.businessProcessId = navigation?.extras?.state?.['id'];
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
      this.fileName = navigation?.extras?.state?.['fileName'];
      this.absoluteFilePath = `${this.folderName}/${this.fileName}`;
      this.name = this.data?.name;
      this.description = this.data?.description;
      this.bpRequirementId = this.fileName.split('-')[0];
    }
    this.initializeBusinessProcessForm();
  }

  enhanceBusinessProcess() {
    if (!this.businessProcessForm.valid) {
      this.toastService.showError('Please fill in all required fields before enhancing');
      return;
    }

    this.loadingService.setLoading(true);
    const formValue = this.businessProcessForm.getRawValue();

    const enhanceRequest: IEnhanceBusinessProcessRequest = {
      documentData: {
        documentTypeId: 'bp',
        name: formValue.title,
        description: this.oldContent
      },
      mode: this.mode === 'edit' ? 'update' : 'add',
      solutionId: this.solutionId,
      selectedBRDs: formValue.selectedBRDs,
      selectedPRDs: formValue.selectedPRDs,
      newBpDescription: formValue.content
    };

    this.electronService.enhanceBusinessProcess(enhanceRequest)
      .then((response: IEnhanceBusinessProcessResponse) => {
        const enhancedContent = this.mode === 'edit' 
          ? response.updated?.requirement 
          : response.LLMreqt?.requirement;
        
        const enhancedTitle = this.mode === 'edit'
          ? response.updated?.title 
          : response.LLMreqt?.title;
          
        if (enhancedContent) {
          this.businessProcessForm.patchValue({
            title: enhancedTitle,
            content: enhancedContent
          });
          this.toastService.showSuccess('Business process enhanced successfully');
        } else {
          throw new Error('No enhanced content received from the service');
        }
      })
      .catch((error) => {
        this.loggerService.error('Error enhancing business process:', error);
        this.toastService.showError(error.message || 'Failed to enhance business process');
      })
      .finally(() => {
        this.loadingService.setLoading(false);
      });
  }


  addBusinessProcess() {
    const formValue = this.businessProcessForm.getRawValue();

    const body: IAddBusinessProcessRequest = {
      solutionId: this.solutionId,
      description: formValue.content,
      name: formValue.title,
      selectedBRDs: formValue.selectedBRDs,
      selectedPRDs: formValue.selectedPRDs,
    };

    this.electronService.addBusinessProcess(body).then(() => {
      this.allowForceRedirect = true;
      this.navigateBackToDocumentList(this.data);
      this.toastService.showSuccess(
        TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.folderName),
      );
    })
    .catch((error) => {
      this.loggerService.error('Error updating requirement:', error); 
      this.toastService.showError(
        TOASTER_MESSAGES.ENTITY.ADD.FAILURE(this.folderName),
      );
    })
  }

  private async handleBusinessProcessUpdate(fileData: {
    description: string;
    name: string;
    selectedBRDs: number[];
    selectedPRDs: number[];
  }) {
    // Re-Generate flow chart diagram
    const updatedDiagram = await this.regenerateProcessFlowDiagram(
      this.bpRequirementId,
      fileData.description,
      fileData.name,
      fileData.selectedBRDs,
      fileData.selectedPRDs,
    );

    // Todo: Update the flow chart diagram in the database

    this.loadingService.setLoading(false);
    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
        this.folderName,
        this.bpRequirementId,
      ),
    );
  }

  async updateBusinessProcess() {
    const formValue = this.businessProcessForm.getRawValue();
    this.loadingService.setLoading(true);

    const body: IUpdateProcessRequest = {
      solutionId: Number(this.solutionId),
      businessProcessId: Number(this.businessProcessId),
      description: formValue.content,
      name: formValue.title,
      selectedBRDs: formValue.selectedBRDs,
      selectedPRDs: formValue.selectedPRDs,
    };

    this.electronService.updateBusinessProcess(body).then(async (data) => {
  
      await this.handleBusinessProcessUpdate({
        description: formValue.content,
        name: formValue.title,
        selectedBRDs: formValue.selectedBRDs,
        selectedPRDs: formValue.selectedPRDs,
      });

      // Update original values after successful save
      this.originalSelectedPRDs = [...formValue.selectedPRDs];
      this.originalSelectedBRDs = [...formValue.selectedBRDs];
      this.businessProcessForm.markAsUntouched();
      this.businessProcessForm.markAsPristine();
    })
    .catch((error) => {
      this.loggerService.error('Error updating requirement:', error);
      this.loadingService.setLoading(false);
      this.toastService.showError(
        TOASTER_MESSAGES.ENTITY.UPDATE.FAILURE(
          this.folderName,
          this.bpRequirementId,
        ),
      );
    });
  }

  async initializeBusinessProcessForm() {
    this.businessProcessForm = new FormGroup({
      title: new FormControl('', Validators.compose([Validators.required])),
      content: new FormControl('', Validators.compose([Validators.required])),
      expandAI: new FormControl(false),
      selectedBRDs: new FormControl([]),
      selectedPRDs: new FormControl([]),
    });

    
    if (this.mode === 'edit') {
      try {
        const res = await this.electronService.getBusinessProcess({
          solutionId: this.solutionId,
          businessProcessId: Number(this.businessProcessId),
        });

        this.oldContent = res.description;
        
        // Filter PRDs and BRDs
        const linkedPRDs = res.documents
        .filter(doc => doc?.docType === RequirementTypeEnum.PRD)
          .map(doc => doc!.documentId);
        
        const linkedBRDs = res.documents.filter(doc => 
          doc?.docType === RequirementTypeEnum.BRD
        ).map(doc => doc!.documentId);

        this.selectedPRDs = linkedPRDs;
        this.selectedBRDs = linkedBRDs;
        this.originalSelectedPRDs = [...linkedPRDs];
        this.originalSelectedBRDs = [...linkedBRDs];

        this.businessProcessForm.patchValue({
          title: res.name,
          content: res.description,
          selectedBRDs: linkedBRDs,
          selectedPRDs: linkedPRDs,
        });

        this.updateIncludePRDandBRDValidator();
      } catch (error) {
        this.loggerService.error('Error initializing form:', error);
        this.toastService.showError('Failed to load business process data');
      }
    }
  }

  updateContentValidators() {
    const contentControl = this.businessProcessForm.get('content');
    contentControl?.setValidators(Validators.required);
    contentControl?.updateValueAndValidity();
  }

  selectTab = (tab: string): void => {
    this.selectedTab = tab;
    this.getRequirementFiles(this.selectedTab);
  }

  async getRequirementFiles(type: string) {
    this.loading = true;
    try {
      const response: Document[] = await this.electronService.getAllDocuments({
        solutionId: this.solutionId,
      });
      this.originalDocumentList = response.filter(doc => 
        (type === this.requirementTypes.PRD && doc.documentTypeId === DocumentTypeMappingEnum.PRD) ||
        (type === this.requirementTypes.BRD && doc.documentTypeId === DocumentTypeMappingEnum.BRD)
      );
    } catch (error) {
      this.loggerService.error('Error fetching documents:', error);
      this.toastService.showError('Failed to fetch documents');
    } finally {
      this.loading = false;
    }
  }

  isSelected(itemId: number, type: string): boolean {
    const selectedItems = type === this.requirementTypes.PRD ? this.selectedPRDs : this.selectedBRDs;
    return selectedItems.includes(itemId);
  }

  toggleSelection(checked: boolean, itemId: number, type: string): void {
    if (type === this.requirementTypes.PRD) {
      this.updateSelection(this.selectedPRDs, itemId, checked, 'selectedPRDs');
    } else if (type === this.requirementTypes.BRD) {
      this.updateSelection(this.selectedBRDs, itemId, checked, 'selectedBRDs');
    }
  }

  updateSelection(array: number[], itemId: number, checked: boolean, controlName: string): void {
    let newArray = [...array];
    const index = newArray.indexOf(itemId);
    
    if (checked && index === -1) {
      newArray.push(itemId);
    } else if (!checked && index > -1) {
      newArray.splice(index, 1);
    }
    
    this.businessProcessForm.get(controlName)?.setValue(newArray);

    if (controlName === 'selectedPRDs') {
      this.selectedPRDs = newArray;
    } else if (controlName === 'selectedBRDs') {
      this.selectedBRDs = newArray;
    }
    
    this.updateContentValidators();
    this.updateIncludePRDandBRDValidator();
  }

  ngOnInit() {
    this.getRequirementFiles(this.selectedTab);
    this.store.dispatch(new ClearBRDPRDState());
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
        },
      })
      .then();
  }

  updateChatHistory(chatHistory: any) {
    this.store.dispatch(
      new UpdateFile(this.absoluteFilePath, {
        requirement: this.businessProcessForm.get('content')?.value,
        title: this.businessProcessForm.get('title')?.value,
        selectedBRDs: this.businessProcessForm.get('selectedBRDs')?.value,
        selectedPRDs: this.businessProcessForm.get('selectedPRDs')?.value,
        flowChartDiagram: this.existingFlowDiagram,
        chatHistory,
      }),
    );
  }

  appendRequirement(data: any) {
    let { chat, chatHistory } = data;
    if (chat.assistant) {
      this.businessProcessForm.patchValue({
        content: `${this.businessProcessForm.get('content')?.value} ${chat.assistant}`,
      });
      let newArray = chatHistory.map((item: any) => {
        if (item.assistant == chat.assistant) return { ...item, isAdded: true };
        else return item;
      });
      this.store.dispatch(
        new UpdateFile(this.absoluteFilePath, {
          requirement: this.businessProcessForm.get('content')?.value,
          title: this.businessProcessForm.get('title')?.value,
          selectedBRDs: this.businessProcessForm.get('selectedBRDs')?.value,
          selectedPRDs: this.businessProcessForm.get('selectedPRDs')?.value,
          flowChartDiagram: this.existingFlowDiagram,
          chatHistory: newArray,
        }),
      );
      this.updateBusinessProcess();
    }
  }

  async regenerateProcessFlowDiagram(
    id: string,
    title: string,
    requirement: string,
    selectedBRDs: number[],
    selectedPRDs: number[],
  ): Promise<string> {
    const request: IFlowChartRequest = {
      id: id,
      title,
      description: requirement,
      selectedBRDs,
      selectedPRDs,
    };
    try {
      const response = await this.featureService.addFlowChart(request);
      return response.flowChartData;
    } catch (error) {
      this.loggerService.error(
        'Error from BE while generating flow chart',
        error,
      );
      return '';
    }
  }

  switchTab = (tab: string): void=> {
    this.activeTab = tab;
  }

  navigateToBPFlow() {
    this.router
      .navigate(['/bp-flow/edit', this.bpRequirementId], {
        state: {
          data: this.data,
          id: this.projectId,
          folderName: this.folderName,
          fileName: this.fileName,
          req: {
            id: this.bpRequirementId,
            title: this.businessProcessForm.get('title')?.value,
            requirement: this.businessProcessForm.get('content')?.value,
            selectedBRDs: this.selectedBRDs,
            selectedPRDs: this.selectedPRDs,
          },
          selectedFolder: {
            title: this.folderName,
            id: this.projectId,
            metadata: this.data,
          },
        },
      })
      .then();
  }

  deleteBP() {
    this.dialogService
      .confirm({
        title: CONFIRMATION_DIALOG.DELETION.TITLE,
        description: CONFIRMATION_DIALOG.DELETION.DESCRIPTION(
          this.bpRequirementId,
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
              this.bpRequirementId,
            ),
          );
        }
      });
  }

  checkFormValidity(): boolean {
    this.updateIncludePRDandBRDValidator();
    return !this.businessProcessForm.valid;
  }

  updateIncludePRDandBRDValidator(): void {
    if (!(this.selectedPRDs.length > 0 || this.selectedBRDs.length > 0)) {
      this.businessProcessForm.setErrors({ noPrdOrBrd: true });
    } else {
      this.businessProcessForm.setErrors(null);
    }
  }

  formatBusinessProcessId(id: number): string {
    return `BP-${id.toString().padStart(2, '0')}`;
  }
  
  truncatePRDandBRDRequirement(requirement: string | undefined, folderName: string): string {
    if (!requirement) return '';
    
    const requirementType = FOLDER_REQUIREMENT_TYPE_MAP[folderName];
    if (requirementType === REQUIREMENT_TYPE.PRD) {
      return processPRDContentForView(requirement, 64);
    }

    return truncateMarkdown(requirement, {maxChars: 180});
  }

  private areSelectionsEqual(original: number[], current: number[]): boolean {
    if (original.length !== current.length) return false;
    return original.every(id => current.includes(id));
  }

  canDeactivate(): boolean {
    // Check form changes
    const hasFormChanges = this.businessProcessForm.dirty && this.businessProcessForm.touched;
    
    // Compare original vs current PRD selections
    const hasPRDChanges = !this.areSelectionsEqual(this.originalSelectedPRDs, this.selectedPRDs);
    
    // Compare original vs current BRD selections
    const hasBRDChanges = !this.areSelectionsEqual(this.originalSelectedBRDs, this.selectedBRDs);

    // Return true to allow navigation only if there are no changes or force redirect is allowed
    return !this.allowForceRedirect && (hasFormChanges || hasPRDChanges || hasBRDChanges);
  }
}
