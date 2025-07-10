import {
  Component,
  EventEmitter,
  inject,
  Inject,
  OnInit,
  Output,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextareaFieldComponent } from '../core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../core/button/button.component';
import { AppSelectComponent, SelectOption } from '../core/app-select/app-select.component';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-test-case-context-modal',
  templateUrl: './test-case-context-modal.component.html',
  styleUrls: ['./test-case-context-modal.component.scss'],
  standalone: true,
  imports: [TextareaFieldComponent, ReactiveFormsModule, ButtonComponent, AppSelectComponent, NgIf],
})
export class TestCaseContextModalComponent implements OnInit {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
  testCaseForm!: FormGroup;
  readonly dialogRef = inject(MatDialogRef<TestCaseContextModalComponent>);
  
  // User story options for the dropdown
  userStoryOptions: SelectOption[] = [];

  onGenerate() {
    const formValues = {
      userScreensInvolved: this.testCaseForm.getRawValue().userScreensInvolved,
      extraContext: this.testCaseForm.getRawValue().extraContext,
      selectedUserStoryId: this.testCaseForm.getRawValue().selectedUserStoryId ?? null
    };
    this.dialogRef.close(formValues);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  ngOnInit(): void {
    // Initialize user story options if provided
    if (this.data.userStories) {
      console.log('User stories provided:', this.data.userStories);
      this.userStoryOptions = this.data.userStories.map((story: any) => ({
        value: story.id,
        label: story.prdId ? 
          `${story.prdId} > ${story.id}: ${story.name}` : 
          `${story.id}: ${story.name}`
      }));
      
      // Sort options by label for better organization
      this.userStoryOptions.sort((a, b) => a.label.localeCompare(b.label));
    }
    
    // Create form with appropriate controls
    const formControls: any = {
      userScreensInvolved: new FormControl(''),
      extraContext: new FormControl(''),
    };
    this.testCaseForm = new FormGroup(formControls);
  }
}
