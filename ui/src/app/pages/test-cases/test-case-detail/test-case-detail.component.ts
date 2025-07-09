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
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { NGXLogger } from 'ngx-logger';
import { TextareaFieldComponent } from '../../../components/core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../../../components/core/button/button.component';
import { AppSelectComponent } from '../../../components/core/app-select/app-select.component';
import { InputFieldComponent } from '../../../components/core/input-field/input-field.component';
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
import {
  CONFIRMATION_DIALOG,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../../constants/app.constants';
import {
  ITestCase,
  ITestCaseStep,
  TestCaseMode,
  TestCaseStatus,
  TEST_CASE_PRIORITY,
  TEST_CASE_TYPE
} from '../../../model/interfaces/test-case/testcase.interface';
import { AppSystemService } from 'src/app/services/app-system/app-system.service';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { RequirementIdService } from 'src/app/services/requirement-id.service';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { AddBreadcrumb, DeleteBreadcrumb } from 'src/app/store/breadcrumb/breadcrumb.actions';
import { ProjectsState } from 'src/app/store/projects/projects.state';
import { SetSelectedUserStory } from 'src/app/store/user-stories/user-stories.actions';
import { TestCaseService } from 'src/app/services/test-case/test-case.service';

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
  private testCaseService = inject(TestCaseService);

  testCaseForm!: FormGroup;
  subscriptions: Subscription[] = [];

  mode: TestCaseMode = TestCaseMode.VIEW;
  formModified = false;
  currentProject = '';
  userStoryId = '';
  testCase: ITestCase | null = null;
  breadcrumbLabel = '';

  priorityOptions = this.testCaseService.priorityOptions;
  typeOptions = this.testCaseService.typeOptions;
  statusOptions = this.testCaseService.statusOptions;

  @HostListener('input') onFormInput() {
    if (this.mode === TestCaseMode.EDIT || this.mode === TestCaseMode.ADD) {
      this.formModified = true;
    }
  }

  ngOnInit(): void {
    // Since we have routing scroll position resotration in routing module to be  enabled  and not 'top', need to explicitly reset scroll position of the main layout's scrollable area
    const testCaseContainer = document.querySelector('.test-case-detail-container') as HTMLElement;
    if (testCaseContainer) {
      testCaseContainer.scrollTop = 0;
    }

    this.subscriptions.push(
      this.store.select(ProjectsState.getSelectedProject).subscribe((project) => {
        this.currentProject = project;
      })
    );

    // Extract user story ID from route params
    this.userStoryId = this.route.snapshot.paramMap.get('userStoryId') || '';
    if (!this.userStoryId) {
      this.toast.showError('User story ID not found');
      return;
    }

    // Determine mode from URL path
    const urlPath = this.router.url;
    if (urlPath.endsWith('/add')) {
      this.mode = TestCaseMode.ADD;
    } else if (urlPath.endsWith('/edit')) {
      this.mode = TestCaseMode.EDIT;
    } else if (urlPath.endsWith('/view')) {
      this.mode = TestCaseMode.VIEW;
    } else {
      this.mode = TestCaseMode.VIEW; // Default fallback
    }

    this.initForm();

    this.subscriptions.push(
      this.testCaseForm.valueChanges.subscribe(() => {
        if (this.mode !== TestCaseMode.VIEW) this.formModified = true;
      })
    );

    if (this.mode === TestCaseMode.ADD) {
      this.setupAddMode();
    } else {
      const testCaseId = this.route.snapshot.paramMap.get('testCaseId') || '';
      if (!testCaseId) {
        this.toast.showError('Test case ID not found');
        return;
      }
      this.loadTestCase(testCaseId);
    }
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
      priority: [TEST_CASE_PRIORITY.MEDIUM, Validators.required],
      type: [TEST_CASE_TYPE.FUNCTIONAL, Validators.required],
      status: [TestCaseStatus.ACTIVE, Validators.required],
      preConditions: this.fb.array([]),
      postConditions: this.fb.array([]),
      steps: this.fb.array([]),
    });

    if (this.mode === TestCaseMode.VIEW) this.testCaseForm.disable();
  }

  private loadTestCase(testCaseId: string) {
    this.subscriptions.push(
      this.testCaseService.getTestCase(this.currentProject, this.userStoryId, testCaseId)
        .subscribe({
          next: (testCase) => {
            this.testCase = testCase;
            this.breadcrumbLabel = `${testCase.id}: ${testCase.title}`;
            this.store.dispatch(
              new AddBreadcrumb({ label: this.breadcrumbLabel, tooltipLabel: testCase.description })
            );
            this.populateForm(testCase);
          },
          error: (error) => {
            this.toast.showError(`Failed to load test case ${testCaseId}`);
            this.navigateBack();
          }
        })
    );
  }

  private populateForm(testCase: ITestCase) {
    const pre = this.testCaseForm.get('preConditions') as FormArray;
    const post = this.testCaseForm.get('postConditions') as FormArray;
    const steps = this.testCaseForm.get('steps') as FormArray;
    pre.clear(); post.clear(); steps.clear();

    this.testCaseForm.patchValue({ ...testCase });
    testCase.preConditions?.forEach(c => pre.push(this.fb.control(c)));
    testCase.postConditions?.forEach(c => post.push(this.fb.control(c)));
    testCase.steps?.forEach(s => steps.push(this.createStepFormGroup(s)));
    if (this.mode === TestCaseMode.VIEW) this.testCaseForm.disable();
  }

  get preConditions(): FormArray {
    return this.testCaseForm.get('preConditions') as FormArray;
  }
  
  get postConditions(): FormArray {
    return this.testCaseForm.get('postConditions') as FormArray;
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
  
  addPostCondition() { this.postConditions.push(this.fb.control('')); this.formModified = true; }
  removePostCondition(i: number) { this.postConditions.removeAt(i); this.formModified = true; }

  addStep() { this.steps.push(this.createStepFormGroup()); this.formModified = true; }
  removeStep(i: number) {
    this.steps.removeAt(i); this.formModified = true;
    for (let j = i; j < this.steps.length; j++) {
      this.steps.at(j).get('stepNumber')?.setValue(j + 1);
    }
  }

  enableEditMode() {
    this.mode = TestCaseMode.EDIT;
    this.testCaseForm.enable();
    this.formModified = false;
  }

  saveTestCase() {
    if (this.testCaseForm.invalid) {
      this.markFormGroupTouched(this.testCaseForm);
      this.toast.showWarning('Please fill in all required fields before saving');
      return;
    }

    const raw = this.testCaseForm.getRawValue();
    
    if (raw.preConditions) {
      raw.preConditions = raw.preConditions.filter((item: string) => item && item.trim() !== '');
    }
    
    if (raw.postConditions) {
      raw.postConditions = raw.postConditions.filter((item: string) => item && item.trim() !== '');
    }
    
    const isNew = this.mode === TestCaseMode.ADD;
    
    this.subscriptions.push(
      this.testCaseService.saveTestCase(this.currentProject, this.userStoryId, raw, isNew)
        .subscribe({
          next: () => {
            if (isNew) {
              this.toast.showSuccess(TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(REQUIREMENT_TYPE.TC));
            } else {
              this.toast.showSuccess(TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(REQUIREMENT_TYPE.TC, raw.id));
            }
            this.navigateBack();
          },
          error: (error) => {
            if (isNew) {
              this.toast.showError(TOASTER_MESSAGES.ENTITY.ADD.FAILURE(REQUIREMENT_TYPE.TC));
            } else {
              this.toast.showError(TOASTER_MESSAGES.ENTITY.UPDATE.FAILURE(REQUIREMENT_TYPE.TC, raw.id));
            }
          }
        })
    );
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
        this.subscriptions.push(
          this.testCaseService.deleteTestCase(this.currentProject, this.userStoryId, id)
            .subscribe({
              next: () => {
                this.toast.showSuccess(TOASTER_MESSAGES.ENTITY.DELETE.SUCCESS(REQUIREMENT_TYPE.TC, id));
                this.navigateBack();
              },
              error: (error) => {
                this.toast.showError(TOASTER_MESSAGES.ENTITY.DELETE.FAILURE(REQUIREMENT_TYPE.TC, id));
              }
            })
        );
      }
    });
  }

  cancel() {
    if (this.formModified && this.mode !== TestCaseMode.VIEW) {
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
    this.router.navigate(['/test-cases', this.userStoryId ]);
  }

  canDeactivate(): boolean {
    return !this.formModified || this.mode === TestCaseMode.VIEW;
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
