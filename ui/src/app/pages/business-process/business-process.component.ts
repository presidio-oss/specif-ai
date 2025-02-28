import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsState } from '../../store/projects/projects.state';
import { Store } from '@ngxs/store';
import { firstValueFrom } from 'rxjs';
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
  IFlowChartRequest,
  IUpdateProcessRequest,
} from '../../model/interfaces/IBusinessProcess';
import { RequirementTypeEnum } from '../../model/enum/requirement-type.enum';
import { MatDialog } from '@angular/material/dialog';
import { LoadingService } from '../../services/loading.service';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { AiChatComponent } from '../../components/ai-chat/ai-chat.component';
import { ExpandDescriptionPipe } from '../../pipes/expand-description.pipe';
import { TruncateEllipsisPipe } from '../../pipes/truncate-ellipsis-pipe';
import { NgIconComponent } from '@ng-icons/core';
import { NGXLogger } from 'ngx-logger';
import {
  CONFIRMATION_DIALOG,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';

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
  ],
})
export class BusinessProcessComponent implements OnInit {
  projectId: string = '';
  folderName: string = '';
  fileName: string = '';
  name: string = '';
  description: string = '';
  content: string = '';
  title: string = '';
  mode: 'edit' | 'add' = 'edit';
  data: any = {};
  selectedRequirement: any = {};
  absoluteFilePath: string = '';
  oldContent: string = '';
  existingFlowDiagram: string = '';
  public loading: boolean = false;
  selectedBPFileContent$ = this.store.select(
    ProjectsState.getSelectedFileContent,
  );
  businessProcessForm!: FormGroup;
  response: IList = {} as IList;
  selectedPRDs: any[] = [];
  selectedBRDs: any[] = [];
  selectedTab: string = RequirementTypeEnum.PRD;
  editLabel: string = '';
  bpRequirementId: string = '';
  requirementTypes: any = RequirementTypeEnum;
  readonly dialog = inject(MatDialog);
  allowFreeEdit: boolean = false;
  activeTab: string = 'includeFiles';
  protected readonly JSON = JSON;
  toastService = inject(ToasterService);

  originalDocumentList$: Observable<IList[]> = this.store.select(
    ProjectsState.getSelectedFileContents,
  );

  chatHistory: any = [];

  removePRD(prd: { requirement: string; fileName: string }): void {
    this.selectedPRDs = this.selectedPRDs.filter(
      (item) =>
        !(
          item.requirement === prd.requirement && item.fileName === prd.fileName
        ),
    );
    this.businessProcessForm.get('selectedPRDs')?.setValue(this.selectedPRDs);
    this.updateContentValidators();
    this.updateIncludePRDandBRDValidator();
  }

  removeBRD(brd: { requirement: string; fileName: string }): void {
    this.selectedBRDs = this.selectedBRDs.filter(
      (item) =>
        !(
          item.requirement === brd.requirement && item.fileName === brd.fileName
        ),
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

  private streamSelectedStoring(
    dataRequirements: string[],
    formRequirements: { requirement: any; fileName: any }[],
  ): any[] {
    return dataRequirements
      .map((requirement: string) => {
        const formItem = formRequirements.find(
          (item: { requirement: any }) => item.requirement === requirement,
        );
        return formItem ? { requirement, fileName: formItem.fileName } : null;
      })
      .filter((item) => item !== null);
  }

  private handleBusinessProcessCreation(fileData: {
    requirement: string;
    title: string;
    selectedBRDs: any[];
    selectedPRDs: any[];
  }) {
    this.store.dispatch(
      new CreateFile(`${this.folderName}/`, {
        requirement: fileData.requirement,
        title: fileData.title,
        selectedBRDs: fileData.selectedBRDs,
        selectedPRDs: fileData.selectedPRDs,
        flowChartDiagram: '',
        chatHistory: this.chatHistory,
      }),
    );
    this.allowFreeEdit = true;
    this.navigateBackToDocumentList(this.data);
    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(this.folderName),
    );
  }

  addBusinessProcess() {
    const formValue = this.businessProcessForm.getRawValue();
    const expandWithAI = formValue.expandAI;

    // Handle locally without API call if AI expansion is not needed
    if (!expandWithAI) {
      this.handleBusinessProcessCreation({
        requirement: formValue.content,
        title: formValue.title,
        selectedBRDs: formValue.selectedBRDs,
        selectedPRDs: formValue.selectedPRDs,
      });
      return;
    }

    const body: IAddBusinessProcessRequest = {
      reqt: formValue.content,
      addReqtType: this.folderName,
      contentType: 'userContent',
      description: this.data.description,
      id: this.data.id,
      name: this.data.name,
      title: formValue.title,
      useGenAI: expandWithAI,
      selectedBRDs: formValue.selectedBRDs.map(
        (item: { requirement: any; fileName: any }) => item.requirement,
      ),
      selectedPRDs: formValue.selectedPRDs.map(
        (item: { requirement: any; fileName: any }) => item.requirement,
      ),
    };

    this.featureService.addBusinessProcess(body).subscribe({
      next: (data) => {
        const selectedBRDsWithId = this.streamSelectedStoring(
          data.selectedBRDs,
          formValue.selectedBRDs,
        );
        const selectedPRDsWithId = this.streamSelectedStoring(
          data.selectedPRDs,
          formValue.selectedPRDs,
        );

        this.handleBusinessProcessCreation({
          requirement: data.LLMreqt.requirement,
          title: data.LLMreqt.title,
          selectedBRDs: selectedBRDsWithId,
          selectedPRDs: selectedPRDsWithId,
        });
      },
      error: (error) => {
        this.loggerService.error('Error updating requirement:', error); // Handle any errors
        this.toastService.showError(
          TOASTER_MESSAGES.ENTITY.ADD.FAILURE(this.folderName),
        );
      },
    });
  }

  private async handleBusinessProcessUpdate(fileData: {
    requirement: string;
    title: string;
    selectedBRDs: any[];
    selectedPRDs: any[];
  }) {
    // Get BRD and PRD requirements for diagram generation
    const selectedBRDRequirements = fileData.selectedBRDs.map(
      (item: { requirement: any }) => item.requirement,
    );
    const selectedPRDRequirements = fileData.selectedPRDs.map(
      (item: { requirement: any }) => item.requirement,
    );

    // Re-Generate flow chart diagram
    const updatedDiagram = await this.regenerateProcessFlowDiagram(
      this.bpRequirementId,
      fileData.title,
      fileData.requirement,
      selectedBRDRequirements,
      selectedPRDRequirements,
    );

    // Update file with new data
    this.store.dispatch(
      new UpdateFile(this.absoluteFilePath, {
        requirement: fileData.requirement,
        title: fileData.title,
        selectedBRDs: fileData.selectedBRDs,
        selectedPRDs: fileData.selectedPRDs,
        flowChartDiagram: updatedDiagram,
        chatHistory: this.chatHistory,
      }),
    );

    this.loadingService.setLoading(false);
    this.allowFreeEdit = true;
    this.toastService.showSuccess(
      TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(
        this.folderName,
        this.bpRequirementId,
      ),
    );
  }

  async updateBusinessProcess() {
    const formValue = this.businessProcessForm.getRawValue();
    const expandWithAI = formValue.expandAI;
    this.loadingService.setLoading(true);

    // Handle locally without API call if AI expansion is not needed
    if (!expandWithAI) {
      await this.handleBusinessProcessUpdate({
        requirement: formValue.content,
        title: formValue.title,
        selectedBRDs: formValue.selectedBRDs,
        selectedPRDs: formValue.selectedPRDs,
      });
      return;
    }

    const body: IUpdateProcessRequest = {
      updatedReqt: formValue.content,
      reqId: this.bpRequirementId,
      reqDesc: this.oldContent,
      contentType: 'userContent',
      description: this.description,
      id: this.data.id,
      name: this.name,
      title: formValue.title,
      useGenAI: expandWithAI,
      selectedBRDs: formValue.selectedBRDs.map(
        (item: { requirement: any; fileName: any }) => item.requirement,
      ),
      selectedPRDs: formValue.selectedPRDs.map(
        (item: { requirement: any; fileName: any }) => item.requirement,
      ),
    };

    this.featureService.updateBusinessProcess(body).subscribe({
      next: async (data) => {
        const selectedBRDsWithId = this.streamSelectedStoring(
          data.selectedBRDs,
          formValue.selectedBRDs,
        );
        const selectedPRDsWithId = this.streamSelectedStoring(
          data.selectedPRDs,
          formValue.selectedPRDs,
        );

        await this.handleBusinessProcessUpdate({
          requirement: data.updated.requirement,
          title: data.updated.title,
          selectedBRDs: selectedBRDsWithId,
          selectedPRDs: selectedPRDsWithId,
        });
      },
      error: (error) => {
        this.loggerService.error('Error updating requirement:', error);
        this.loadingService.setLoading(false);
        this.toastService.showError(
          TOASTER_MESSAGES.ENTITY.UPDATE.FAILURE(
            this.folderName,
            this.bpRequirementId,
          ),
        );
      },
    });
  }

  initializeBusinessProcessForm() {
    this.businessProcessForm = new FormGroup({
      title: new FormControl('', Validators.compose([Validators.required])),
      content: new FormControl('', Validators.compose([Validators.required])),
      expandAI: new FormControl(false),
      selectedBRDs: new FormControl([]),
      selectedPRDs: new FormControl([]),
    });
    if (this.mode === 'edit') {
      this.store.dispatch(new ReadFile(`${this.folderName}/${this.fileName}`));
      this.selectedBPFileContent$.subscribe((res: any) => {
        this.oldContent = res.requirement;
        this.selectedPRDs = res.selectedPRDs;
        this.selectedBRDs = res.selectedBRDs;
        this.businessProcessForm.patchValue({
          title: res.title,
          content: res.requirement,
          selectedBRDs: res.selectedBRDs,
          selectedPRDs: res.selectedPRDs,
        });
        this.existingFlowDiagram = res.flowChartDiagram;
        this.chatHistory = res.chatHistory || [];
        this.updateIncludePRDandBRDValidator();
      });
    }
  }

  updateContentValidators() {
    const contentControl = this.businessProcessForm.get('content');
    contentControl?.setValidators(Validators.required);
    contentControl?.updateValueAndValidity();
  }

  selectTab(tab: string): void {
    this.selectedTab = tab;
    this.getRequirementFiles(this.selectedTab);
  }

  getRequirementFiles(title: string) {
    return this.store.dispatch(new BulkReadFiles(title));
  }

  isSelected(
    item: { fileName: string; requirement: string | undefined },
    type: string,
  ): boolean {
    const selectedItems: any =
      type === this.requirementTypes.PRD
        ? this.selectedPRDs
        : this.selectedBRDs;
    return selectedItems.some(
      (selectedItem: { requirement: string; fileName: string }) =>
        selectedItem.requirement === item.requirement &&
        selectedItem.fileName === item.fileName,
    );
  }

  toggleSelection(event: any, type: string): void {
    const item = JSON.parse(event.target.value);
    const checked = event.target.checked;
    if (type === this.requirementTypes.PRD) {
      this.updateSelection(this.selectedPRDs, item, checked, 'selectedPRDs');
    } else if (type === this.requirementTypes.BRD) {
      this.updateSelection(this.selectedBRDs, item, checked, 'selectedBRDs');
    }
  }

  updateSelection(
    array: any[],
    item: { requirement: string; fileName: string },
    checked: boolean,
    controlName: string,
  ): void {
    const newArray = [...array];
    const index = newArray.findIndex(
      (x) => x.requirement === item.requirement && x.fileName === item.fileName,
    );
    if (checked && index === -1) {
      newArray.push(item);
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
    }
  }

  async regenerateProcessFlowDiagram(
    id: string,
    title: string,
    requirement: string,
    selectedBRDs: string[],
    selectedPRDs: string[],
  ): Promise<string> {
    const request: IFlowChartRequest = {
      id: id,
      title,
      description: requirement,
      selectedBRDs,
      selectedPRDs,
    };
    try {
      return await firstValueFrom(this.featureService.addFlowChart(request));
    } catch (error) {
      this.loggerService.error(
        'Error from BE while generating flow chart',
        error,
      );
      return '';
    }
  }

  switchTab(tab: string): void {
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
            selectedBRDs: this.selectedBRDs.map((brd) => brd.requirement),
            selectedPRDs: this.selectedPRDs.map((prd) => prd.requirement),
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
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: CONFIRMATION_DIALOG.DELETION.TITLE,
        description: CONFIRMATION_DIALOG.DELETION.DESCRIPTION(
          this.bpRequirementId,
        ),
        cancelButtonText: CONFIRMATION_DIALOG.DELETION.CANCEL_BUTTON_TEXT,
        proceedButtonText: CONFIRMATION_DIALOG.DELETION.PROCEED_BUTTON_TEXT,
      },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (!res) {
        this.store.dispatch(new ArchiveFile(this.absoluteFilePath));
        this.allowFreeEdit = true;
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

  canDeactivate(): boolean {
    return (
      !this.allowFreeEdit &&
      this.businessProcessForm.dirty &&
      this.businessProcessForm.touched
    );
  }
}
