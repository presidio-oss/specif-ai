import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import {
  AppSelectComponent,
  SelectOption,
} from '../../components/core/app-select/app-select.component';
import { CommonModule, NgClass, NgForOf, NgIf } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  ITestCase,
  ITestCaseStep,
} from '../../model/interfaces/test-case/testcase.interface';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { MatIconModule } from '@angular/material/icon';
import { provideIcons, NgIconComponent } from '@ng-icons/core';
import {
  heroPlus,
  heroTrash,
  heroDocumentDuplicate,
} from '@ng-icons/heroicons/outline';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { DialogService } from '../../services/dialog/dialog.service';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { UpdateFile, ArchiveFile, CreateFile } from '../../store/projects/projects.actions';
import { SetSelectedUserStory } from '../../store/user-stories/user-stories.actions';
import { NGXLogger } from 'ngx-logger';
import { RequirementIdService } from '../../services/requirement-id.service';
import {
  CONFIRMATION_DIALOG,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import {
  AddBreadcrumb,
  DeleteBreadcrumb,
} from '../../store/breadcrumb/breadcrumb.actions';

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
  providers: [provideIcons({ heroPlus, heroTrash, heroDocumentDuplicate })],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TestCaseDetailPageComponent implements OnInit, OnDestroy {
  constructor(
    private fb: FormBuilder,
    private appSystemService: AppSystemService,
    private toast: ToasterService,
    private requirementIdService: RequirementIdService,
    private dialogService: DialogService,
  ) {}

  router = inject(Router);
  route = inject(ActivatedRoute);
  logger = inject(NGXLogger);
  store = inject(Store);

  testCaseForm!: FormGroup;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Track if form has been modified
  formModified = false;

  // Mode can be 'view', 'edit', or 'add'
  mode: 'view' | 'edit' | 'add' = 'view';

  fromGlobalView: boolean = false;

  // Priority options
  priorityOptions: SelectOption[] = [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ];

  // Type options
  typeOptions: SelectOption[] = [
    { value: 'Functional', label: 'Functional' },
    { value: 'Integration', label: 'Integration' },
    { value: 'UI/UX', label: 'UI/UX' },
    { value: 'Performance', label: 'Performance' },
    { value: 'Security', label: 'Security' },
  ];

  // Current project path
  currentProject: string = '';

  // User story ID for this test case
  userStoryId: string = '';

  // Test case data
  testCase: ITestCase | null = null;

  // Breadcrumb label
  breadcrumbLabel: string = '';

  // Track form changes
  @HostListener('input')
  onFormInput() {
    if (this.mode === 'edit' || this.mode === 'add') {
      this.formModified = true;
    }
  }

  ngOnInit(): void {
    this.fromGlobalView = history.state?.fromGlobalView === true;

    // Get the current project
    const projectSub = this.store
      .select(ProjectsState.getSelectedProject)
      .subscribe((project) => {
        this.currentProject = project;
      });
    this.subscriptions.push(projectSub);

    // Get the mode from the route first
    const routeSub = this.route.data.subscribe((data) => {
      this.mode = data['mode'] || 'view';

      // Get the user story ID from the route
      this.userStoryId = this.route.snapshot.paramMap.get('userStoryId') || '';

      if (!this.userStoryId) {
        this.toast.showError('User story ID not found');
        this.navigateBack();
        return;
      }

      // Initialize the form after we know the mode
      this.initForm();

      // Subscribe to form value changes
      const formSub = this.testCaseForm.valueChanges.subscribe(() => {
        if (this.mode === 'edit' || this.mode === 'add') {
          this.formModified = true;
        }
      });
      this.subscriptions.push(formSub);

      // If we're in add mode, we're done
      if (this.mode === 'add') {
        // Add breadcrumb
        this.breadcrumbLabel = `Add Test Case`;
        this.store.dispatch(
          new AddBreadcrumb({
            label: this.breadcrumbLabel,
            tooltipLabel: `Add new test case for ${this.userStoryId}`,
          }),
        );

        // Add at least one empty step for new test cases
        this.addStep();
        return;
      }

      // Get the test case ID from the route
      const testCaseId = this.route.snapshot.paramMap.get('testCaseId') || '';

      if (!testCaseId) {
        this.toast.showError('Test case ID not found');
        this.navigateBack();
        return;
      }

      // Load the test case
      this.loadTestCase(testCaseId);
    });
    this.subscriptions.push(routeSub);
  }

  // Initialize the form with empty values
  initForm(): void {
    this.testCaseForm = this.fb.group({
      id: [''],
      title: ['', Validators.required],
      description: ['', Validators.required],
      priority: ['Medium', Validators.required],
      type: ['Functional', Validators.required],
      preConditions: this.fb.array([]),
      steps: this.fb.array([]),
    });

    // If we're in view mode, disable the form
    if (this.mode === 'view') {
      this.testCaseForm.disable();
    } else {
      // Ensure the form is enabled for add and edit modes
      this.testCaseForm.enable();
    }
  }

  // Load a test case by ID
  loadTestCase(testCaseId: string): void {
    const testCasePath = `${this.currentProject}/${REQUIREMENT_TYPE.TC}/${this.userStoryId}`;
    const fileName = `${testCaseId}-base.json`;
    const filePath = `${testCasePath}/${fileName}`;

    this.logger.debug(`Loading test case from ${filePath}`);

    this.appSystemService
      .readFile(filePath)
      .then((content: string) => {
        try {
          const testCase = JSON.parse(content);
          this.testCase = testCase;

          // Add breadcrumb
          this.breadcrumbLabel = `${testCase.id}: ${testCase.title}`;
          this.store.dispatch(
            new AddBreadcrumb({
              label: this.breadcrumbLabel,
              tooltipLabel: testCase.description,
            }),
          );

          // Populate the form
          this.populateForm(testCase);
        } catch (error) {
          this.logger.error(`Error parsing test case file ${fileName}:`, error);
          this.toast.showError(`Failed to load test case ${testCaseId}`);
          this.navigateBack();
        }
      })
      .catch((error) => {
        this.logger.error(`Error reading test case file ${fileName}:`, error);
        this.toast.showError(`Failed to load test case ${testCaseId}`);
        this.navigateBack();
      });
  }

  // Populate the form with test case data
  populateForm(testCase: ITestCase): void {
    this.testCaseForm.patchValue({
      id: testCase.id,
      title: testCase.title,
      description: testCase.description,
      priority: testCase.priority,
      type: testCase.type,
    });

    // Clear and populate preConditions
    const preConditionsArray = this.testCaseForm.get(
      'preConditions',
    ) as FormArray;
    preConditionsArray.clear();

    if (testCase.preConditions && testCase.preConditions.length > 0) {
      testCase.preConditions.forEach((condition) => {
        preConditionsArray.push(this.fb.control(condition));
      });
    }

    // Clear and populate steps
    const stepsArray = this.testCaseForm.get('steps') as FormArray;
    stepsArray.clear();

    if (testCase.steps && testCase.steps.length > 0) {
      testCase.steps.forEach((step) => {
        stepsArray.push(this.createStepFormGroup(step));
      });
    }

    // Ensure form is disabled in view mode
    if (this.mode === 'view') {
      this.testCaseForm.disable();
    }
  }

  // Get the preConditions form array
  get preConditions(): FormArray {
    return this.testCaseForm.get('preConditions') as FormArray;
  }

  // Get the steps form array
  get steps(): FormArray {
    return this.testCaseForm.get('steps') as FormArray;
  }

  // Create a form group for a test case step
  createStepFormGroup(step?: ITestCaseStep): FormGroup {
    return this.fb.group({
      stepNumber: [step ? step.stepNumber : this.steps.length + 1],
      action: [step ? step.action : '', Validators.required],
      expectedResult: [step ? step.expectedResult : '', Validators.required],
    });
  }

  // Add a new precondition
  addPreCondition(): void {
    this.preConditions.push(this.fb.control(''));
    this.formModified = true;
  }

  // Remove a precondition
  removePreCondition(index: number): void {
    this.preConditions.removeAt(index);
    this.formModified = true;
  }

  // Add a new step
  addStep(): void {
    this.steps.push(this.createStepFormGroup());
    if (this.mode === 'edit' || this.mode === 'add') {
      this.formModified = true;
    }
  }

  // Remove a step
  removeStep(index: number): void {
    this.steps.removeAt(index);
    this.formModified = true;

    // Update step numbers for remaining steps
    for (let i = index; i < this.steps.length; i++) {
      this.steps
        .at(i)
        .get('stepNumber')
        ?.setValue(i + 1);
    }
  }

  // Switch to edit mode
  enableEditMode(): void {
    this.mode = 'edit';
    this.testCaseForm.enable();
    this.formModified = false;
  }

  // Save the test case
  saveTestCase(): void {
    if (this.testCaseForm.invalid) {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.testCaseForm);
      return;
    }

    // Reset the form modified flag
    this.formModified = false;

    const testCaseData = this.testCaseForm.getRawValue();

    // If we're in add mode, generate a new ID
    if (this.mode === 'add') {
      const nextTestCaseId = this.requirementIdService.getNextRequirementId(
        REQUIREMENT_TYPE.TC,
      );
      const tcNumber = nextTestCaseId.toString().padStart(2, '0');
      testCaseData.id = `TC${tcNumber}`;

      // Update the requirement counter
      this.requirementIdService.updateRequirementCounters({
        [REQUIREMENT_TYPE.TC]: nextTestCaseId,
      });
    }

    // Save the test case
    this.saveTestCaseToFile(testCaseData);
  }

  // Save the test case to a file
  private saveTestCaseToFile(testCase: ITestCase): void {
    const testCasePath = `${this.currentProject}/${REQUIREMENT_TYPE.TC}/${this.userStoryId}`;
    const fileName = `${testCase.id}-base.json`;
    const filePath = `${testCasePath}/${fileName}`;
    const path = `${REQUIREMENT_TYPE.TC}/${this.userStoryId}/${fileName}`;

    this.logger.debug(`${this.mode === 'add' ? 'Creating' : 'Updating'} test case at ${filePath}`);

    // Create the directory if it doesn't exist
    this.appSystemService
      .createDirectory(testCasePath)
      .then(() => {
        // Use the store to create or update the file based on mode
        if (this.mode === 'add') {
          this.store.dispatch(new CreateFile(path, testCase)).subscribe({
            next: () => {
              this.toast.showSuccess(
                TOASTER_MESSAGES.ENTITY.ADD.SUCCESS(REQUIREMENT_TYPE.TC)
              );
              // Navigate back to the test cases list
              this.navigateBack();
            },
            error: (error) => {
              this.logger.error(`Error creating test case ${testCase.id}:`, error);
              this.toast.showError(
                TOASTER_MESSAGES.ENTITY.ADD.FAILURE(REQUIREMENT_TYPE.TC)
              );
            },
          });
        } else {
          this.store.dispatch(new UpdateFile(path, testCase)).subscribe({
            next: () => {
              this.toast.showSuccess(
                TOASTER_MESSAGES.ENTITY.UPDATE.SUCCESS(REQUIREMENT_TYPE.TC, testCase.id)
              );
              // Navigate back to the test cases list
              this.navigateBack();
            },
            error: (error) => {
              this.logger.error(`Error updating test case ${testCase.id}:`, error);
              this.toast.showError(
                TOASTER_MESSAGES.ENTITY.UPDATE.FAILURE(REQUIREMENT_TYPE.TC, testCase.id)
              );
            },
          });
        }
      })
      .catch((error) => {
        this.logger.error(`Error creating directory ${testCasePath}:`, error);
        this.toast.showError(
          `Failed to create directory for test case ${testCase.id}`
        );
      });
  }

  // Delete the test case
  deleteTestCase(): void {
    const testCaseId = this.testCaseForm.get('id')?.value;

    if (!testCaseId) {
      this.toast.showError('Test case ID not found');
      return;
    }

    // For test cases, we don't need to check for associations like PRDs or BRDs
    // since test cases don't have dependencies that would prevent deletion
    this.promptTestCaseDeletion(testCaseId);
  }

  // Show confirmation dialog and delete the test case if confirmed
  private promptTestCaseDeletion(testCaseId: string): void {
    this.dialogService
      .confirm({
        title: CONFIRMATION_DIALOG.DELETION.TITLE,
        description: CONFIRMATION_DIALOG.DELETION.DESCRIPTION(testCaseId),
        cancelButtonText: CONFIRMATION_DIALOG.DELETION.CANCEL_BUTTON_TEXT,
        confirmButtonText: CONFIRMATION_DIALOG.DELETION.PROCEED_BUTTON_TEXT,
      })
      .subscribe((result) => {
        if (result) {
          const testCasePath = `${REQUIREMENT_TYPE.TC}/${this.userStoryId}/${testCaseId}-base.json`;

          this.store.dispatch(new ArchiveFile(testCasePath)).subscribe({
            next: () => {
              this.toast.showSuccess(
                TOASTER_MESSAGES.ENTITY.DELETE.SUCCESS(
                  REQUIREMENT_TYPE.TC,
                  testCaseId,
                ),
              );
              this.navigateBack();
            },
            error: (error) => {
              this.logger.error(
                `Error deleting test case ${testCaseId}:`,
                error,
              );
              this.toast.showError(
                TOASTER_MESSAGES.ENTITY.DELETE.FAILURE(
                  REQUIREMENT_TYPE.TC,
                  testCaseId,
                ),
              );
            },
          });
        }
      });
  }

  cancel(): void {
    // If form is modified and in edit/add mode, show confirmation dialog
    if (this.formModified && (this.mode === 'edit' || this.mode === 'add')) {
      this.dialogService
        .confirm({
          title: 'Discard Changes',
          description:
            'You have unsaved changes. Are you sure you want to discard them?',
          confirmButtonText: 'Discard',
          cancelButtonText: 'Keep Editing',
        })
        .subscribe((result) => {
          if (result) {
            this.navigateBack();
          }
        });
    } else {
      this.navigateBack();
    }
  }

  // Navigate back to the test cases list
  navigateBack(): void {
    // Set the user story ID in the store before navigating back
    if (this.userStoryId) {
      this.store.dispatch(new SetSelectedUserStory(this.userStoryId));
    }
    
    if (this.fromGlobalView) {
      this.router.navigate(['/test-cases']); // go back to global view
    } else {
      this.router.navigate(['/test-cases', this.userStoryId]); // go back to specific user story
    }
  }

  // Required by CanDeactivateGuard to check if user can navigate away
  canDeactivate(): boolean {
    // Allow navigation if form is not modified or if in view mode
    return !this.formModified || this.mode === 'view';
  }

  // Helper method to mark all controls in a form group as touched
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        for (let i = 0; i < control.length; i++) {
          const arrayControl = control.at(i);
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        }
      }
    });
  }

  // Get form control error state
  hasError(controlName: string): boolean {
    const control = this.testCaseForm.get(controlName);
    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  // Get step form control error state
  hasStepError(stepIndex: number, controlName: string): boolean {
    const stepGroup = this.steps.at(stepIndex) as FormGroup;
    const control = stepGroup.get(controlName);
    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  ngOnDestroy() {
    // Remove the breadcrumb when the component is destroyed
    if (this.breadcrumbLabel) {
      this.store.dispatch(new DeleteBreadcrumb(this.breadcrumbLabel));
    }

    // Unsubscribe from all subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
