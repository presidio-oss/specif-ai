import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthStateService } from '../services/auth/auth-state.service';
import { UserProfileDialogComponent } from '../components/user-profile-dialog/user-profile-dialog.component';
import { MatDialog } from '@angular/material/dialog';

export const AuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);
  const dialog = inject(MatDialog);

  if (!authState.isAuthenticated()) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  if(!authState.isUsernameSet()) {
    dialog.open(UserProfileDialogComponent, {
      width: '600px',
      disableClose: true,
    });
  }
  return true;
};