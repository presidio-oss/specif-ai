import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { ElectronService } from './electron-bridge/electron.service';
import { StartupService } from './services/auth/startup.service';
import { Store } from '@ngxs/store';
import { LLMConfigState } from './store/llm-config/llm-config.state';
import { SetLLMConfig } from './store/llm-config/llm-config.actions';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { AnalyticsModalComponent } from './components/analytics-modal/analytics-modal.component';
import { AnalyticsTracker } from './services/analytics/analytics.interface';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  electronService = inject(ElectronService);
  logger = inject(NGXLogger);
  router = inject(Router);
  startupService = inject(StartupService);
  store = inject(Store);
  dialog = inject(MatDialog);
  analyticsTracker = inject(AnalyticsTracker);
  
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
      this.startupService.isLoggedIn$
        .pipe(filter((isLoggedIn) => isLoggedIn))
        .subscribe(() => {
          this.initializeLLMConfig();
          this.checkAnalyticsPermission();
        }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async initializeLLMConfig() {
    this.logger.debug('Initializing LLM configuration');

    try {
      // First try to get config from localStorage as it's the source of truth
      const localConfig = localStorage.getItem('llmConfig') || await this.electronService.getStoreValue('llmConfig');
      if (localConfig) {
        console.log("Local Config", localConfig)
        try {
          const config = JSON.parse(localConfig);
          const response = await this.electronService.verifyLLMConfig(
            config.activeProvider,
            config.providerConfigs[config.activeProvider].config
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
            savedConfig.activeProvider,
            savedConfig.providerConfigs[savedConfig.activeProvider].config
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
      if (currentState?.activeProvider) {
        const response = await this.electronService.verifyLLMConfig(
          currentState.activeProvider,
          currentState.providerConfigs[currentState.activeProvider].config
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

  private checkAnalyticsPermission() {
    const ANALYTICS_PERMISSION_REQUESTED = 'analyticsPermissionRequested';
    const analyticsPermission = localStorage.getItem(ANALYTICS_PERMISSION_REQUESTED);
    if (analyticsPermission !== 'true') {
      this.dialog.open(AnalyticsModalComponent, {
        width: '600px',
        disableClose: true,
      });
      localStorage.setItem(ANALYTICS_PERMISSION_REQUESTED, 'true');
      return;
    }
    this.analyticsTracker.initAnalytics();
  }
}
