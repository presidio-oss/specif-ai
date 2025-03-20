import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { ElectronService } from './services/electron/electron.service';
import { AuthService } from './services/auth/auth.service';
import { Store } from '@ngxs/store';
import { LLMConfigState } from './store/llm-config/llm-config.state';
import { SetLLMConfig, SyncLLMConfig } from './store/llm-config/llm-config.actions';
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

  private async initializeLLMConfig() {
    this.logger.debug('Initializing LLM configuration');
    if (!this.authService.isAuthenticated()) {
      this.logger.debug('User not authenticated, skipping LLM configuration verification');
      return;
    }

    try {
      // First try to get config from localStorage as it's the source of truth
      const localConfig = localStorage.getItem('llmConfig') || await this.electronService.getStoreValue('llmConfig');
      if (localConfig) {
        console.log("Local Config", localConfig)
        try {
          const config = JSON.parse(localConfig);
          const response = await this.electronService.verifyLLMConfig(
            config.provider,
            config.model,
            config.config
          );
          if (response.status === 'success') {
            this.logger.debug('LLM configuration verified successfully');
          } else {
            this.logger.error('LLM configuration verification failed:', response.message);
          }
          return;
        } catch (e) {
          this.logger.error('Error parsing saved LLM config:', e);
        }
      }

      // If no localStorage config, try electron store
      const savedConfig = await this.electronService.getStoreValue('llmConfig');
      if (savedConfig) {
        // Set in store and wait for completion before verification
        await this.store.dispatch(new SetLLMConfig(savedConfig)).toPromise();
        const response = await this.electronService.verifyLLMConfig(
          savedConfig.provider,
          savedConfig.model,
          savedConfig.config
        );
        if (response.status === 'success') {
          this.logger.debug('LLM configuration verified successfully');
        } else {
          this.logger.error('LLM configuration verification failed:', response.message);
        }
        return;
      }

      // Finally check store state if no other configs found
      const currentState = this.store.selectSnapshot(LLMConfigState.getConfig);
      if (currentState?.provider) {
        const response = await this.electronService.verifyLLMConfig(
          currentState.provider,
          currentState.model,
          currentState.config
        );
        if (response.status === 'success') {
          this.logger.debug('LLM configuration verified successfully');
        } else {
          this.logger.error('LLM configuration verification failed:', response.message);
        }
      } else {
        this.logger.debug('No LLM configuration found to verify');
      }
    } catch (error) {
      this.logger.error('Error initializing LLM configuration:', error);
    }
  }
}
