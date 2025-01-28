import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { ElectronService } from './services/electron/electron.service';
import { AuthService } from './services/auth/auth.service';
import { Store } from '@ngxs/store';
import { LLMConfigState } from './store/llm-config/llm-config.state';
import { VerifyLLMConfig } from './store/llm-config/llm-config.actions';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  electronService = inject(ElectronService);
  logger = inject(NGXLogger);
  router = inject(Router);
  authService = inject(AuthService);
  store = inject(Store);

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    if (sessionStorage.getItem('serverActive') !== 'true') {
      this.electronService
        .listenPort()
        .then(() => {
          // Success logic if needed
        })
        .catch((error) => {
          this.logger.error('Error listening to port', error);
          alert('An error occurred while trying to listen to the port.');
        });
    }

    this.initializeLLMConfig();

    this.subscriptions.push(
      this.authService.isLoggedIn$.pipe(
        filter(isLoggedIn => isLoggedIn)
      ).subscribe(() => {
        this.initializeLLMConfig();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeLLMConfig() {
    this.logger.debug('Initializing LLM configuration');
    if (this.authService.isAuthenticated()) {
      this.store.dispatch(new VerifyLLMConfig()).subscribe({
        next: () => this.logger.debug('LLM configuration verified successfully'),
        error: (error) => this.logger.error('Error verifying LLM configuration', error)
      });
    } else {
      this.logger.debug('User not authenticated, skipping LLM configuration verification');
    }
  }
}
