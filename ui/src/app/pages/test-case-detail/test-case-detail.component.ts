import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription, take } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { NGXLogger } from 'ngx-logger';

import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { AppSelectComponent } from '../../components/core/app-select/app-select.component';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { MatIconModule } from '@angular/material/icon';
import { provideIcons, NgIconComponent } from '@ng-icons/core';
import { 
  heroPlus, 
  heroTrash, 
  heroDocumentDuplicate, 
  heroBeaker,
  heroPencil,
  heroArrowLeft,
  heroCheck,
  heroXMark,
  heroTag,
  heroFlag,
  heroSquares2x2,
  heroCircleStack,
  heroDocumentText,
  heroClipboard,
  heroClipboardDocument,
  heroListBullet,
  heroArrowUp,
  heroArrowDown,
  heroPlay,
  heroCheckCircle,
  heroExclamationTriangle
} from '@ng-icons/heroicons/outline';
import { CommonModule, NgClass, NgForOf, NgIf } from '@angular/common';

import { AppSystemService } from '../../services/app-system/app-system.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { DialogService } from '../../services/dialog/dialog.service';
import { RequirementIdService } from '../../services/requirement-id.service';

import { ProjectsState } from '../../store/projects/projects.state';
import { UpdateFile, ArchiveFile } from '../../store/projects/projects.actions';
import { SetSelectedUserStory } from '../../store/user-stories/user-stories.actions';
import { AddBreadcrumb, DeleteBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';

import {
  CONFIRMATION_DIALOG,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';

import {
  ITestCase,
  ITestCaseStep,
} from '../../model/interfaces/test-case/testcase.interface';

@Component({
  selector: 'app-test-case-detail-page',
  templateUrl: './test-case-detail.component.html',
  styleUrls: ['./test-case-detail.component.scss'],
  standalone: true,
  imports: [
    TextareaFieldComponent,
    ReactiveFormsModule,
    ButtonComponent,
    AppSelectComponent,
    NgIf,
    NgForOf,
    NgClass,
    InputFieldComponent,
    MatIconModule,
    NgIconComponent,
    CommonModule,
  ],
  providers: [provideIcons({ 
    heroPlus, 
    heroTrash, 
    heroDocumentDuplicate,
    heroBeaker,
    heroPencil,
    heroArrowLeft,
    heroCheck,
    heroXMark,
    heroTag,
    heroFlag,
    heroSquares2x2,
    heroCircleStack,
    heroDocumentText,
    heroClipboard,
    heroClipboardDocument,
    heroListBullet,
    heroArrowUp,
    heroArrowDown,
    heroPlay,
    heroCheckCircle,
    heroExclamationTriangle
  })],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TestCaseDetailPageComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private appSystemService = inject(AppSystemService);
  private toast = inject(ToasterService);
  private requirementIdService = inject(RequirementIdService);
  private dialogService = inject(DialogService);
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private logger = inject(NGXLogger);

  testCaseForm!: FormGroup;
  subscriptions: Subscription[] = [];

  mode: 'view' | 'edit' | 'add' = 'view';
  fromGlobalView = false;
  formModified = false;
  currentProject = '';
  userStoryId = '';
  testCase: ITestCase | null = null;
  breadcrumbLabel = '';

  priorityOptions = ['High', 'Medium', 'Low'].map((val) => ({ value: val, label: val }));
  typeOptions = ['Functional', 'Integration', 'UI/UX', 'Performance', 'Security'].map((val) => ({ value: val, label: val }));
  statusOptions = ['Active', 'Draft', 'Deprecated', 'Archived'].map((val) => ({ value: val, label: val }));

  @HostListener('input') onFormInput() {
    if (this.mode === 'edit' || this.mode === 'add') {
      this.formModified = true;
    }
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        this.fromGlobalView = params['fromGlobalView'] === 'true';
      })
    );

    this.subscriptions.push(
      this.store.select(ProjectsState.getSelectedProject).subscribe((project) => {
        this.currentProject = project;
      })
    );

    this.subscriptions.push(
      this.route.data.subscribe((data) => {
        this.mode = data['mode'] || 'view';
        this.userStoryId = this.route.snapshot.paramMap.get('userStoryId') || '';

        if (!this.userStoryId) return this.toast.showError('User story ID not found');

        this.initForm();

        this.subscriptions.push(
          this.testCaseForm.valueChanges.subscribe(() => {
            if (this.mode !== 'view') this.formModified = true;
          })
        );

        if (this.mode === 'add') {
          this.setupAddMode();
        } else {
          const testCaseId = this.route.snapshot.paramMap.get('testCaseId') || '';
          if (!testCaseId) return this.toast.showError('Test case ID not found');
          this.loadTestCase(testCaseId);
        }
      })
    );
  }

  private setupAddMode() {
    this.breadcrumbLabel = `Add Test Case`;
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.breadcrumbLabel,
        tooltipLabel: `Add new test case for ${this.userStoryId}`,
      })
    );
    this.addStep();
  }

  private initForm() {
    this.testCaseForm = this.fb.group({
      id: [''],
      title: ['', Validators.required],
      description: ['', Validators.required],
      priority: ['Medium', Validators.required],
      type: ['Functional', Validators.required],
      status: ['Active', Validators.required],
      preConditions: this.fb.array([]),
      steps: this.fb.array([]),
    });

    if (this.mode === 'view') this.testCaseForm.disable();
  }

  private loadTestCase(testCaseId: string) {
    const path = `${this.currentProject}/${REQUIREMENT_TYPE.TC}/${this.userStoryId}/${testCaseId}-base.json`;

    this.appSystemService.readFile(path).then((content) => {
      try {
        const testCase = JSON.parse(content);
        this.testCase = testCase;
        this.breadcrumbLabel = `${testCase.id}: ${testCase.title}`;
        this.store.dispatch(
          new AddBreadcrumb({ label: this.breadcrumbLabel, tooltipLabel: testCase.description })
        );
        this.populateForm(testCase);
      } catch (err) {
        this.logger.error(`Error parsing test case`, err);
        this.toast.showError(`Failed to load test case ${testCaseId}`);
        this.navigateBack();
      }
    }).catch((err) => {
      this.logger.error(`Error reading test case`, err);
      this.toast.showError(`Failed to load test case ${testCaseId}`);
      this.navigateBack();
    });
  }

  private populateForm(testCase: ITestCase) {
    const pre = this.testCaseForm.get('preConditions') as FormArray;
    const steps = this.testCaseForm.get('steps') as FormArray;
    pre.clear(); steps.clear();

    this.testCaseForm.patchValue({ ...testCase });
    testCase.preConditions?.forEach(c => pre.push(this.fb.control(c)));
    testCase.steps?.forEach(s => steps.push(this.createStepFormGroup(s)));
    if (this.mode === 'view') this.testCaseForm.disable();
  }

  get preConditions(): FormArray {
    return this.testCaseForm.get('preConditions') as FormArray;
  }
  get steps(): FormArray {
    return this.testCaseForm.get('steps') as FormArray;
  }

  createStepFormGroup(step?: ITestCaseStep): FormGroup {
    return this.fb.group({
      stepNumber: [step?.stepNumber || this.steps.length + 1],
      action: [step?.action || '', Validators.required],
      expectedResult: [step?.expectedResult || '', Validators.required],
    });
  }

  addPreCondition() { this.preConditions.push(this.fb.control('')); this.formModified = true; }
  removePreCondition(i: number) { this.preConditions.removeAt(i); this.formModified = true; }

  addStep() { this.steps.push(this.createStepFormGroup()); this.formModified = true; }
  removeStep(i: number) {
    this.steps.removeAt(i); this.formModified = true;
    for (let j = i; j < this.steps.length; j++) {
      this.steps.at(j).get('stepNumber')?.setValue(j + 1);
    }
  }
  
  // Step reordering methods removed as per requirement

  enableEditMode() {
    this.mode = 'edit';
    this.testCaseForm.enable();
    this.formModified = false;
  }

  saveTestCase() {
    if (this.testCaseForm.invalid) {
      this.markFormGroupTouched(this.testCaseForm);
      return;
    }

    const raw = this.testCaseForm.getRawValue();
    
    if (this.mode === 'add') {
      const id = this.requirementIdService.getNextRequirementId(REQUIREMENT_TYPE.TC);
      const tcNumber = id.toString().padStart(2, '0');
      raw.id = `TC${tcNumber}`;
      
      // Create the test case path
      const testCasePath = `${this.currentProject}/${REQUIREMENT_TYPE.TC}/${this.userStoryId}`;
      const fileName = `${raw.id}-base.json`;
      const filePath = `${testCasePath}/${fileName}`;
      
      this.appSystemService.createDirectory(testCasePath)
        .then(() => {
          this.appSystemService.createFileWithContent(
            filePath,
            JSON.stringify(raw)
          ).then(() => {
            this.requirementIdService.updateRequirementCounters({ [REQUIREMENT_TYPE.TC]: id });
            this.toast.showSuccess(TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(REQUIREMENT_TYPE.TC));
            this.navigateBack();
          }).catch((error) => {
            this.logger.error(`Error creating test case file:`, error);
            this.toast.showError(TOASTER_MESSAGES.ENTITY.ADD.FAILURE(REQUIREMENT_TYPE.TC));
          });
        })
        .catch((error) => {
          this.logger.error(`Error creating directory ${testCasePath}:`, error);
          this.toast.showError(`Failed to create directory for test case ${raw.id}`);
        });
      
      return;
    }
    
    // For edit mode, use the store dispatch
    const path = `${REQUIREMENT_TYPE.TC}/${this.userStoryId}/${raw.id}-base.json`;
    this.store.dispatch(new UpdateFile(path, raw)).subscribe({
      next: () => {
        this.toast.showSuccess(TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(REQUIREMENT_TYPE.TC, raw.id));
        this.navigateBack();
      },
      error: (e) => {
        this.logger.error(`Error updating test case`, e);
        this.toast.showError(TOASTER_MESSAGES.ENTITY.UPDATE.FAILURE(REQUIREMENT_TYPE.TC, raw.id));
      },
    });
  }

  deleteTestCase() {
    const id = this.testCaseForm.get('id')?.value;
    if (!id) return this.toast.showError('Test case ID not found');

    this.dialogService.confirm({
      title: CONFIRMATION_DIALOG.DELETION.TITLE,
      description: CONFIRMATION_DIALOG.DELETION.DESCRIPTION(id),
      cancelButtonText: CONFIRMATION_DIALOG.DELETION.CANCEL_BUTTON_TEXT,
      confirmButtonText: CONFIRMATION_DIALOG.DELETION.PROCEED_BUTTON_TEXT,
    }).subscribe((result) => {
      if (result) {
        const path = `${REQUIREMENT_TYPE.TC}/${this.userStoryId}/${id}-base.json`;
        this.store.dispatch(new ArchiveFile(path)).subscribe({
          next: () => {
            this.toast.showSuccess(TOASTER_MESSAGES.ENTITY.DELETE.SUCCESS(REQUIREMENT_TYPE.TC, id));
            this.navigateBack();
          },
          error: (e) => {
            this.logger.error(`Error deleting test case`, e);
            this.toast.showError(TOASTER_MESSAGES.ENTITY.DELETE.FAILURE(REQUIREMENT_TYPE.TC, id));
          },
        });
      }
    });
  }

  cancel() {
    if (this.formModified && this.mode !== 'view') {
      this.dialogService.confirm({
        title: 'Discard Changes',
        description: 'You have unsaved changes. Are you sure you want to discard them?',
        confirmButtonText: 'Discard',
        cancelButtonText: 'Keep Editing',
      }).subscribe((result) => result && this.navigateBack());
    } else {
      this.navigateBack();
    }
  }

  navigateBack() {
    if (this.userStoryId) {
      this.store.dispatch(new SetSelectedUserStory(this.userStoryId));
    }
    this.router.navigate(this.fromGlobalView ? ['/test-cases'] : ['/test-cases', this.userStoryId]);
  }

  canDeactivate(): boolean {
    return !this.formModified || this.mode === 'view';
  }

  markFormGroupTouched(form: FormGroup) {
    Object.values(form.controls).forEach((ctrl) => {
      ctrl.markAsTouched();
      if (ctrl instanceof FormGroup || ctrl instanceof FormArray) {
        this.markFormGroupTouched(ctrl as FormGroup);
      }
    });
  }

  hasError(ctrlName: string): boolean {
    const c = this.testCaseForm.get(ctrlName);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  hasStepError(i: number, ctrl: string): boolean {
    const c = (this.steps.at(i) as FormGroup).get(ctrl);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  ngOnDestroy(): void {
    if (this.breadcrumbLabel) this.store.dispatch(new DeleteBreadcrumb(this.breadcrumbLabel));
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
