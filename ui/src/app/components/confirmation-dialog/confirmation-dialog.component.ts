import { Component, inject, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModalDialogCustomComponent } from '../modal-dialog/modal-dialog.component';
import { ButtonComponent } from '../core/button/button.component';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
  standalone: true,
  imports: [ButtonComponent, NgClass],
})
export class ConfirmationDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  readonly dialogRef = inject(MatDialogRef<ModalDialogCustomComponent>);

  onStay() {
    this.dialogRef.close(false);
  }

  onLeave() {
    this.dialogRef.close(true);
  }
}
