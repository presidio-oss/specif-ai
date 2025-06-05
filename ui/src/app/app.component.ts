import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { ElectronService } from './electron-bridge/electron.service';
import { StartupService } from './services/auth/startup.service';
import { Store } from '@ngxs/store';
import { LLMConfigState } from './store/llm-config/llm-config.state';
import { SetLLMConfig } from './store/llm-config/llm-config.actions';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DialogService } from './services/dialog/dialog.service';
import { AnalyticsModalComponent } from './components/analytics-modal/analytics-modal.component';
import { AnalyticsTracker } from './services/analytics/analytics.interface';
import { geoAzimuthalEquidistantRaw } from 'd3';
import { ANALYTICS_TOGGLE_KEY } from './services/analytics/utils/analytics.utils';
import { APP_CONSTANTS } from './constants/app.constants';
import { WorkflowProgressService } from './services/workflow-progress/workflow-progress.service';

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
  dialogService = inject(DialogService);
  analyticsTracker = inject(AnalyticsTracker);
  workflowProgressService = inject(WorkflowProgressService);

  private subscriptions: Subscription[] = [];

  @HostListener('window:keydown', ['$event'])
  keydownHandler(event: KeyboardEvent): void {
    if (event.key === 'F5') {
      event.preventDefault();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
    }
  }

  ngOnInit() {
    // Check authentication state immediately
    this.checkAuthAndRedirect();

    let analyticsEnabled;
    this.electronService.getStoreValue('analyticsEnabled').then((enabled) => {
      analyticsEnabled = enabled;
    });

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
    this.electronService.checkForUpdates();

    this.subscriptions.push(
      this.startupService.isLoggedIn$
        .pipe(filter((isLoggedIn) => isLoggedIn))
        .subscribe(() => {
          this.initializeLLMConfig();
          this.checkAnalyticsPermission();
        }),
    );
  }

  private checkAuthAndRedirect() {
    const username = localStorage.getItem(APP_CONSTANTS.USER_NAME);
    const workingDir = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);

    if (username && workingDir) {
      this.startupService.setIsLoggedIn(true);
      if (this.router.url === '/' || this.router.url === '/login') {
        this.router.navigate(['/apps']);
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.workflowProgressService.removeAllGlobalListeners(this.electronService);
  }

  private async initializeLLMConfig() {
    this.logger.debug('Initializing LLM configuration');

    try {
      const localConfig =
        localStorage.getItem('llmConfig') ||
        (await this.electronService.getStoreValue('llmConfig'));
      if (localConfig) {
        try {
          const config = JSON.parse(localConfig);
          const response = await this.electronService.verifyLLMConfig(
            config.activeProvider,
            config.providerConfigs[config.activeProvider].config,
          );
          if (response.status === 'success') {
            this.logger.debug('LLM configuration verified successfully');
          } else {
            this.logger.error(
              'LLM configuration verification failed:',
              response.message,
            );
          }
          return;
        } catch (e) {
          this.logger.error('Error parsing saved LLM config:', e);
        }
      }

      const savedConfig = await this.electronService.getStoreValue('llmConfig');
      if (savedConfig) {
        await this.store.dispatch(new SetLLMConfig(savedConfig)).toPromise();
        const response = await this.electronService.verifyLLMConfig(
          savedConfig.activeProvider,
          savedConfig.providerConfigs[savedConfig.activeProvider].config,
        );
        if (response.status === 'success') {
          this.logger.debug('LLM configuration verified successfully');
        } else {
          this.logger.error(
            'LLM configuration verification failed:',
            response.message,
          );
        }
        return;
      }

      const currentState = this.store.selectSnapshot(LLMConfigState.getConfig);
      if (currentState?.activeProvider) {
        const response = await this.electronService.verifyLLMConfig(
          currentState.activeProvider,
          currentState.providerConfigs[currentState.activeProvider].config,
        );
        if (response.status === 'success') {
          this.logger.debug('LLM configuration verified successfully');
        } else {
          this.logger.error(
            'LLM configuration verification failed:',
            response.message,
          );
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
    const analyticsPermission = localStorage.getItem(
      ANALYTICS_PERMISSION_REQUESTED,
    );
    this.validateAnalyticsPermission();
    if (analyticsPermission !== 'true') {
      this.dialogService
        .createBuilder()
        .forComponent(AnalyticsModalComponent)
        .withWidth('600px')
        .disableClose()
        .open();
      localStorage.setItem(ANALYTICS_PERMISSION_REQUESTED, 'true');
      return;
    }
    this.analyticsTracker.initAnalytics();
  }

  private async validateAnalyticsPermission() {
    let enabled = await this.electronService.getStoreValue('analyticsEnabled');
    if (enabled === undefined) {
      let value = Boolean(localStorage.getItem(ANALYTICS_TOGGLE_KEY)) || false;
      this.electronService.setStoreValue('analyticsEnabled', value);
    }
  }
}
