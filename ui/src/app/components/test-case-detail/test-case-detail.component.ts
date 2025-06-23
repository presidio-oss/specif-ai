import {
  Component,
  EventEmitter,
  inject,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextareaFieldComponent } from '../core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../core/button/button.component';
import { AppSelectComponent, SelectOption } from '../core/app-select/app-select.component';
import { CommonModule, NgClass, NgForOf, NgIf } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ITestCase, ITestCaseStep } from '../../model/interfaces/test-case/testcase.interface';
import { InputFieldComponent } from '../core/input-field/input-field.component';
import { MatIconModule } from '@angular/material/icon';
import { provideIcons, NgIconComponent } from '@ng-icons/core';
import { heroPlus, heroTrash, heroDocumentDuplicate } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-test-case-detail',
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
    CommonModule
  ],
  providers: [
    provideIcons({ heroPlus, heroTrash, heroDocumentDuplicate })
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TestCaseDetailComponent implements OnInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {}

  readonly dialogRef = inject(MatDialogRef<TestCaseDetailComponent>);
  
  testCaseForm!: FormGroup;
  
  // Mode can be 'view', 'edit', or 'add'
  mode: 'view' | 'edit' | 'add' = 'view';
  
  // Priority options
  priorityOptions: SelectOption[] = [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
  ];
  
  // Type options
  typeOptions: SelectOption[] = [
    { value: 'Functional', label: 'Functional' },
    { value: 'Integration', label: 'Integration' },
    { value: 'UI/UX', label: 'UI/UX' },
    { value: 'Performance', label: 'Performance' },
    { value: 'Security', label: 'Security' }
  ];
  
  ngOnInit(): void {
    // Set the mode from dialog data
    this.mode = this.data.mode || 'view';
    
    // Initialize the form
    this.initForm();
    
    // If we have a test case and we're in view or edit mode, populate the form
    if (this.data.testCase && (this.mode === 'view' || this.mode === 'edit')) {
      this.populateForm(this.data.testCase);
    }
    
    // If we're in view mode, disable the form
    if (this.mode === 'view') {
      this.testCaseForm.disable();
    }
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
      steps: this.fb.array([])
    });
    
    // Add at least one empty step for new test cases
    if (this.mode === 'add') {
      this.addStep();
    }
  }
  
  // Populate the form with test case data
  populateForm(testCase: ITestCase): void {
    this.testCaseForm.patchValue({
      id: testCase.id,
      title: testCase.title,
      description: testCase.description,
      priority: testCase.priority,
      type: testCase.type
    });
    
    // Clear and populate preConditions
    const preConditionsArray = this.testCaseForm.get('preConditions') as FormArray;
    preConditionsArray.clear();
    
    if (testCase.preConditions && testCase.preConditions.length > 0) {
      testCase.preConditions.forEach(condition => {
        preConditionsArray.push(this.fb.control(condition));
      });
    }
    
    // Clear and populate steps
    const stepsArray = this.testCaseForm.get('steps') as FormArray;
    stepsArray.clear();
    
    if (testCase.steps && testCase.steps.length > 0) {
      testCase.steps.forEach(step => {
        stepsArray.push(this.createStepFormGroup(step));
      });
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
      expectedResult: [step ? step.expectedResult : '', Validators.required]
    });
  }
  
  // Add a new precondition
  addPreCondition(): void {
    this.preConditions.push(this.fb.control(''));
  }
  
  // Remove a precondition
  removePreCondition(index: number): void {
    this.preConditions.removeAt(index);
  }
  
  // Add a new step
  addStep(): void {
    this.steps.push(this.createStepFormGroup());
  }
  
  // Remove a step
  removeStep(index: number): void {
    this.steps.removeAt(index);
    
    // Update step numbers for remaining steps
    for (let i = index; i < this.steps.length; i++) {
      this.steps.at(i).get('stepNumber')?.setValue(i + 1);
    }
  }
  
  // Switch to edit mode
  enableEditMode(): void {
    this.mode = 'edit';
    this.testCaseForm.enable();
  }
  
  // Save the test case
  saveTestCase(): void {
    if (this.testCaseForm.invalid) {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.testCaseForm);
      return;
    }
    
    const testCaseData = this.testCaseForm.getRawValue();
    this.dialogRef.close(testCaseData);
  }
  
  // Cancel and close the dialog
  cancel(): void {
    this.dialogRef.close();
  }
  
  // Helper method to mark all controls in a form group as touched
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
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
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
  
  // Get step form control error state
  hasStepError(stepIndex: number, controlName: string): boolean {
    const stepGroup = this.steps.at(stepIndex) as FormGroup;
    const control = stepGroup.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
}
