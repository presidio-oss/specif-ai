import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { DEFAULT_JIRA_PORT } from 'src/app/integrations/jira/jira.utils';
import { ElectronService } from 'src/app/services/electron/electron.service';

@Component({
  selector: 'app-port-error-dialog',
  templateUrl: './port-error-dialog.component.html',
  standalone: true,
  imports: [NgIconComponent]
})
export class PortErrorDialogComponent {
  constructor(
    private electronService: ElectronService,
    private dialogRef: MatDialogRef<PortErrorDialogComponent>,
  ) {
    this.dialogRef.disableClose = true;
  }

  killPort() {
    this.electronService.killPort(DEFAULT_JIRA_PORT);
    this.dialogRef.close();
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
