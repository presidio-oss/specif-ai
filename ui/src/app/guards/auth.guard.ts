import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserStateService } from '../services/auth/user-state.service';
import { UserProfileDialogComponent } from '../components/user-profile-dialog/user-profile-dialog.component';
import { DialogService } from '../services/dialog/dialog.service';

export const UserGuard: CanActivateFn = (route, state) => {
  const userState = inject(UserStateService);
  const dialogService = inject(DialogService);

  if (!userState.isWorkingDirSet()) {
    userState.logout(
      'Please select a destination folder and proceed with login.',
    );
    return false;
  }

  if (!userState.isUsernameSet()) {
    dialogService
      .createBuilder()
      .forComponent(UserProfileDialogComponent)
      .withWidth('600px')
      .disableClose()
      .open();
  }
  return true;
};
