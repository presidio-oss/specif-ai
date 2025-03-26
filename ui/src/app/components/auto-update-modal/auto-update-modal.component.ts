import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgIconComponent } from '@ng-icons/core';
import { ElectronService } from 'src/app/electron-bridge/electron.service';
import { ButtonComponent } from '../core/button/button.component';
import { TimeZonePipe } from 'src/app/pipes/timezone-pipe';
import { RichTextEditorComponent } from '../core/rich-text-editor/rich-text-editor.component';
import { LoadingService } from 'src/app/services/loading.service';
import { ToasterService } from 'src/app/services/toaster/toaster.service';

@Component({
  selector: 'app-auto-update-modal',
  templateUrl: './auto-update-modal.component.html',
  standalone: true,
  imports: [
    NgIconComponent,
    ButtonComponent,
    TimeZonePipe,
    RichTextEditorComponent
  ]
})
export class AutoUpdateModalComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<AutoUpdateModalComponent>,
    private loadingService: LoadingService,
    private electronService: ElectronService,
    private toasterService: ToasterService
  ) {}

  onUpdate() {
    this.loadingService.setLoading(true);
    this.electronService.downloadUpdates(this.data.version).then(() => {
      this.loadingService.setLoading(false);
      this.dialogRef.close(true);
    }).catch((err) => {
      console.error('Error occurred during newer version download: ', err);
      this.loadingService.setLoading(false);
      this.toasterService.showError('Something went wrong.');
    });
  }

  onCancel() {
    this.dialogRef.close(true);
  }
}
