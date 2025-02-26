import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ElectronService } from 'src/app/services/electron/electron.service';

@Component({
  selector: 'app-port-error-dialog',
  templateUrl: './port-error-dialog.component.html',
  styleUrls: ['./port-error-dialog.component.scss']
})
export class PortErrorDialogComponent {
  constructor(
    private electronService: ElectronService,
    private dialogRef: MatDialogRef<PortErrorDialogComponent>
  ) {}

  killPort() {
    const port = 49153; 
    this.electronService.killPort(port);
    this.dialogRef.close();
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
