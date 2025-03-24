import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserStateService } from '../services/auth/user-state.service';
import { UserProfileDialogComponent } from '../components/user-profile-dialog/user-profile-dialog.component';
import { MatDialog } from '@angular/material/dialog';

export const UserGuard: CanActivateFn = (route, state) => {
  const userState = inject(UserStateService);
  const dialog = inject(MatDialog);

  if (!userState.isUsernameSet()) {
    dialog.open(UserProfileDialogComponent, {
      width: '600px',
      disableClose: true,
    });
  }
  return true;
};
