import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ToasterService } from '../toaster/toaster.service';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private loggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private router: Router,
    private toast: ToasterService,
  ) {
    this.checkInitialAuthState();
  }

  private checkInitialAuthState(): void {
    const hasCredentials = this.isAuthenticated();
    this.setIsLoggedIn(hasCredentials);
  }

  public isAuthenticated(): boolean {
    const encodedPasscode = localStorage.getItem(APP_CONSTANTS.APP_PASSCODE_KEY);
    const appUrl = localStorage.getItem(APP_CONSTANTS.APP_URL);
    return !!encodedPasscode && !!appUrl;
  }

  public isUsernameSet(): boolean {
    const username = localStorage.getItem(APP_CONSTANTS.USER_NAME);
    return !!username;
  }

  setIsLoggedIn(isLoggedIn: boolean) {
    this.loggedInSubject.next(isLoggedIn);
  }

  logout(errorMessage?: string) {
    localStorage.removeItem(APP_CONSTANTS.APP_PASSCODE_KEY);
    localStorage.removeItem(APP_CONSTANTS.APP_URL);
    localStorage.removeItem(APP_CONSTANTS.USER_NAME);
    this.setIsLoggedIn(false);
    this.router.navigate(['/login']).then(() => {
      if (errorMessage) {
        this.toast.showError(errorMessage);
      }
    });
  }
}
