import {
  Component,
  EventEmitter,
  inject,
  Inject,
  OnInit,
  Output,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TextareaFieldComponent } from '../core/textarea-field/textarea-field.component';
import { ButtonComponent } from '../core/button/button.component';

@Component({
  selector: 'app-modal-dialog',
  templateUrl: './modal-dialog.component.html',
  styleUrls: ['./modal-dialog.component.scss'],
  standalone: true,
  imports: [TextareaFieldComponent, ReactiveFormsModule, ButtonComponent],
})
export class ModalDialogCustomComponent implements OnInit {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
  emittedForm!: FormGroup;
  @Output() generate = new EventEmitter<string>();
  readonly dialogRef = inject(MatDialogRef<ModalDialogCustomComponent>);

  onGenerate() {
    const value = this.emittedForm.getRawValue().extraContext;
    this.dialogRef.close(value);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  ngOnInit(): void {
    this.emittedForm = new FormGroup({
      extraContext: new FormControl(''),
    });
  }
}
