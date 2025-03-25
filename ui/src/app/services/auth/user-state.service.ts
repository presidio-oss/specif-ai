import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ToasterService } from '../toaster/toaster.service';
import { APP_CONSTANTS } from '../../constants/app.constants';

@Injectable({
  providedIn: 'root',
})
export class UserStateService {
  private loggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private router: Router,
    private toast: ToasterService,
  ) {
    this.checkInitialUserState();
  }

  private checkInitialUserState(): void {
    const hasUsername = this.isUsernameSet();
    this.setIsLoggedIn(hasUsername);
  }

  public isUsernameSet(): boolean {
    const username = localStorage.getItem(APP_CONSTANTS.USER_NAME);
    return !!username;
  }

  setIsLoggedIn(isLoggedIn: boolean) {
    this.loggedInSubject.next(isLoggedIn);
  }

  logout(errorMessage?: string) {
    localStorage.removeItem(APP_CONSTANTS.USER_NAME);
    this.setIsLoggedIn(false);
    this.router.navigate(['/login']).then(() => {
      if (errorMessage) {
        this.toast.showError(errorMessage);
      }
    });
  }
}
