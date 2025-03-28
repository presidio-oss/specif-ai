import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DialogBuilder } from './dialog.builder';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogData } from './dialog-config.interface';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  createBuilder<T = any, R = any>(): DialogBuilder<T, R> {
    return new DialogBuilder<T, R>(this.dialog);
  }

  confirm(data: ConfirmationDialogData): Observable<boolean> {
    return this.createBuilder<ConfirmationDialogData, boolean>()
      .forComponent(ConfirmationDialogComponent)
      .withWidth('500px')
      .withData(data)
      .open()
      .afterClosed()
      .pipe(map((result: boolean | undefined) => result ?? false));
  }

  closeAll(): void {
    this.dialog.closeAll();
  }
}
