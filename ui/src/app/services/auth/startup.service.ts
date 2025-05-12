import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { VerifyLLMConfig } from '../../store/llm-config/llm-config.actions';
import { ToasterService } from '../toaster/toaster.service';
import { LLMConfigState } from '../../store/llm-config/llm-config.state';
import { UserStateService } from './user-state.service';

@Injectable({
  providedIn: 'root',
})
export class StartupService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private userState = inject(UserStateService);
  private store = inject(Store);
  private toasterService = inject(ToasterService);

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    if (this.userState.isUsernameSet() && this.userState.isWorkingDirSet()) {
      this.setIsLoggedIn(true);
      this.initializeLLMConfig().subscribe({
        next: () => {
          this.router.navigateByUrl('/apps');
        },
        error: () => {
          this.userState.logout(
            'Error initializing LLM config. Please try again.',
          );
        },
      });
    }
  }

  public initializeLLMConfig(): Observable<any> {
    return this.store.selectOnce(LLMConfigState.getConfig).pipe(
      switchMap((config) => {
        if (
          config &&
          config.activeProvider &&
          config.providerConfigs[config.activeProvider]
        ) {
          return this.store.dispatch(new VerifyLLMConfig());
        } else {
          this.toasterService.showError(
            'Settings required: Please add your AI configuration in settings to continue.',
          );
          return of(null);
        }
      }),
    );
  }

  public verifyProviderConfig(
    provider: string,
    model: string,
  ): Observable<any> {
    return this.http.post('model/config-verification', { provider, model });
  }

  // Expose user state observables
  get isLoggedIn$() {
    return this.userState.isLoggedIn$;
  }

  setIsLoggedIn(isLoggedIn: boolean) {
    this.userState.setIsLoggedIn(isLoggedIn);
  }

  logout(errorMessage?: string) {
    this.userState.logout(errorMessage);
  }
}
