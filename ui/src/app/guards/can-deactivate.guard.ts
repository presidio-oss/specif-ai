import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CONFIRMATION_DIALOG } from '../constants/app.constants';
import { DialogService } from '../services/dialog/dialog.service';

// Define the interface for the component that can be deactivated
export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Observable<boolean> | Promise<boolean>;
}

@Injectable({
  providedIn: 'root',
})
export class CanDeactivateGuard
  implements CanDeactivate<CanComponentDeactivate>
{
  constructor(private dialogService: DialogService) {}

  canDeactivate(
    component: CanComponentDeactivate,
  ): Observable<boolean> | Promise<boolean> | boolean {
    if (component.canDeactivate()) {
      return this.openDialog();
    }
    return true;
  }

  private openDialog(): Observable<boolean> {
    return this.dialogService
      .confirm({
        title: CONFIRMATION_DIALOG.UNSAVED_CHANGES.TITLE,
        description: CONFIRMATION_DIALOG.UNSAVED_CHANGES.DESCRIPTION,
        confirmButtonText:
          CONFIRMATION_DIALOG.UNSAVED_CHANGES.PROCEED_BUTTON_TEXT,
        cancelButtonText:
          CONFIRMATION_DIALOG.UNSAVED_CHANGES.CANCEL_BUTTON_TEXT,
      })
      .pipe(map((result: boolean) => !result));
  }
}

// return component.canDeactivate ? component.canDeactivate() : true;