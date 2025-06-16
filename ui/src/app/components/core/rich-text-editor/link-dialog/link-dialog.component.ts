import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ButtonComponent } from '../../../core/button/button.component';

@Component({
  selector: 'app-link-dialog',
  templateUrl: './link-dialog.component.html',
  standalone: true,
  imports: [
    FormsModule, 
    NgIf,
    ButtonComponent,
    MatDialogModule
  ]
})
export class LinkDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<LinkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { url: string, isEdit: boolean }
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.data);
  }
}
