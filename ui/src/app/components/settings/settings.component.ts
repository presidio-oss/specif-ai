import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { LLMConfigState } from 'src/app/store/llm-config/llm-config.state';
import { distinctUntilChanged, Observable, Subscription } from 'rxjs';
import { LLMConfigModel } from '../../model/interfaces/ILLMConfig';
import { Store } from '@ngxs/store';
import { AvailableProviders } from '../../constants/llm.models.constants';
import { SetBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';
import {
  SetLLMConfig,
  SyncLLMConfig,
} from '../../store/llm-config/llm-config.actions';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogService } from '../../services/dialog/dialog.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { NgForOf, NgIf } from '@angular/common';
import { StartupService } from '../../services/auth/startup.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { ButtonComponent } from '../core/button/button.component';
import { AppSelectComponent } from '../core/app-select/app-select.component';
import {
  APP_CONSTANTS,
  CONFIRMATION_DIALOG,
} from '../../constants/app.constants';
import { environment } from 'src/environments/environment';
import { ElectronService } from 'src/app/electron-bridge/electron.service';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { getLLMProviderConfig, ProviderField } from '../../constants/llm-provider-config';
import { AnalyticsEventSource, AnalyticsEvents, AnalyticsEventStatus } from 'src/app/services/analytics/events/analytics.events';
import { AnalyticsTracker } from 'src/app/services/analytics/analytics.interface';
import { getAnalyticsToggleState, setAnalyticsToggleState } from '../../services/analytics/utils/analytics.utils';
import { CoreService } from 'src/app/services/core/core.service';
import { heroExclamationTriangle } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIconComponent,
    NgForOf,
    NgIf,
    ButtonComponent,
    AppSelectComponent,
  ],
  providers: [
    provideIcons({ 
      heroExclamationTriangle
    })
  ]
})
export class SettingsComponent implements OnInit, OnDestroy {
  activeTab: 'general' | 'about' = 'general';
  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig,
  );
  currentLLMConfig!: LLMConfigModel;
  availableProviders = [...AvailableProviders].sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );
  providerOptions = this.availableProviders.map(p => ({
    value: p.key,
    label: p.displayName
  }));
  currentProviderFields: ProviderField[] = [];
  configForm!: FormGroup;
  selectedProvider: FormControl = new FormControl();
  analyticsEnabled: FormControl = new FormControl();
  autoUpdateEnabled: FormControl = new FormControl();
  errorMessage: string = '';
  hasChanges: boolean = false;
  workingDir: string | null;
  appName = environment.ThemeConfiguration.appName;
  private subscriptions: Subscription = new Subscription();
  private initialProvider: string = '';
  private initialAnalyticsState: boolean = false;
  private initialAutoUpdateState: boolean = true;
  protected themeConfiguration = environment.ThemeConfiguration;

  electronService = inject(ElectronService);
  logger = inject(NGXLogger);
  router = inject(Router);
  dialogService = inject(DialogService);
  analyticsWarning: string = '';

  constructor(
    private store: Store,
    private startupService: StartupService,
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private analyticsTracker: AnalyticsTracker,
    private core: CoreService
  ) {
    this.workingDir = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    this.initForm();
  }

  private getAboutInfo() {
    return {
      version: environment.APP_VERSION,
      currentYear: new Date().getFullYear()
    };
  }

  private initForm() {
    this.configForm = this.fb.group({
      provider: ['', Validators.required],
      config: this.fb.group({})
    });
  }

  private async updateConfigFields(provider: string) {
    const providerConfig = await getLLMProviderConfig(provider);
    if (!providerConfig) return;

    this.currentProviderFields = providerConfig.fields;
    if (!this.configForm) return;    
    const newConfigGroup = this.fb.group({});
    providerConfig.fields.forEach(field => {
      newConfigGroup.addControl(
        field.name,
        this.fb.control(
          field.defaultValue !== undefined ? field.defaultValue : '',
          field.required ? [Validators.required] : []
        )
      );

    });
    this.configForm.setControl('config', newConfigGroup);
    this.applyStoredConfigValues(provider);
    this.cdr.detectChanges();
  }

  private applyStoredConfigValues(provider: string) {
    if (!this.currentLLMConfig || !this.currentLLMConfig.providerConfigs) return;
    
    const providerConfig = this.currentLLMConfig.providerConfigs[provider];
    if (!providerConfig || !providerConfig.config) return;
    
    const configGroup = this.configForm.get('config') as FormGroup;
    if (!configGroup) return;
    
    const storedConfig: Record<string, any> = providerConfig.config;
    
    configGroup.patchValue(storedConfig, { emitEvent: true });
    this.configForm.markAsPristine();
    
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.store.dispatch(
      new SetBreadcrumb(
        {
          label: 'Settings',
          url: '/settings'
        }
      )
    );

    this.electronService.getStoreValue('APP_CONFIG').then((value) => {
      const { isAutoUpdate = true } = value || {};
      this.autoUpdateEnabled.setValue(isAutoUpdate);
      this.initialAutoUpdateState = isAutoUpdate;
    });

    this.core.getAppConfig()
      .then((config: any) => {
        if (!this.analyticsTracker.isConfigValid(config)) {
          this.analyticsEnabled.setValue(false);
          this.analyticsEnabled.disable({ onlySelf: true });
          this.updateAnalyticsState(false);
          this.hasChanges = false;
          this.analyticsWarning = 'Analytics configuration is missing. Please update the settings.';
        } else {
          this.analyticsEnabled.enable({ onlySelf: true });
          this.analyticsWarning = '';
        }
      })
      .catch((error: any) => {
        console.error('Failed to fetch PostHog configuration:', error);
      });

    const analyticsState = getAnalyticsToggleState();
    this.analyticsEnabled.setValue(analyticsState);
    this.initialAnalyticsState = analyticsState;

    this.onProviderChange();
    this.onAnalyticsToggleChange();
    this.onAutoUpdateToggleChange();

    const providerControl = this.configForm.get('provider');
    if (providerControl) {
      this.subscriptions.add(
        providerControl.valueChanges.subscribe(async(provider) => {
          console.log("Provider Changed", provider);
          await this.updateConfigFields(provider);
          this.errorMessage = '';
        })
      );
    }

    if (this.configForm) {
      // Set initial default values
      const defaultProvider = AvailableProviders[0].key;
      
      this.configForm.patchValue({
        provider: defaultProvider,
        config: {}
      }, { emitEvent: false });
    
      this.subscriptions.add(
        this.llmConfig$.subscribe(async (config) => {
          this.currentLLMConfig = config;
          const provider = config?.activeProvider || defaultProvider;
          this.initialProvider = provider;
          this.selectedProvider.setValue(provider);
          
         await this.updateConfigFields(provider);
          
          this.configForm?.get('provider')?.setValue(provider, { emitEvent: false });
          
          this.hasChanges = false;
        }),
      );

      this.subscriptions.add(
        this.configForm.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
          this.hasChanges = true;
          this.errorMessage = '';
        })
      );
    }
  }
  
  onSave() {
    if (!this.configForm?.valid) return;
    const analyticsEnabled = this.analyticsEnabled.value;

    if (analyticsEnabled !== this.initialAnalyticsState) {
      this.updateAnalyticsState(analyticsEnabled);
      this.initialAnalyticsState = analyticsEnabled;
    }

    if (this.autoUpdateEnabled.value !== this.initialAutoUpdateState) {
      this.electronService.getStoreValue('APP_CONFIG').then((value) => {
        value = value || {};
        this.initialAutoUpdateState = this.autoUpdateEnabled.value;
        this.electronService.setStoreValue('APP_CONFIG', { ...value, isAutoUpdate: this.autoUpdateEnabled.value });
      })
    }

    const formValue = this.configForm.value;
    const provider = formValue.provider;
    this.configForm.updateValueAndValidity();    
    const latestConfigValues = (this.configForm.get('config') as FormGroup).getRawValue();
    console.log("latestConfigValues", JSON.stringify(latestConfigValues))

    this.electronService.verifyLLMConfig(provider, latestConfigValues).then((response) => {
      if (response.status === 'success') {
        const existingConfigs = this.currentLLMConfig.providerConfigs || {};
        const newConfig = {
          activeProvider: formValue.provider,
          providerConfigs: {
            ...existingConfigs,
            [formValue.provider]: {
              config: latestConfigValues
            }
          },
          isDefault: false
        };

        console.log("New subscribe value", JSON.stringify(newConfig))

        this.store.dispatch(new SetLLMConfig(newConfig)).subscribe(() => {
          this.store.dispatch(new SyncLLMConfig()).subscribe(async () => {
            await this.electronService.setStoreValue('llmConfig', newConfig);
            const providerDisplayName =
              this.availableProviders.find((p) => p.key === provider)
                ?.displayName || provider;
            this.toasterService.showSuccess(
              `${providerDisplayName} configuration verified successfully.`,
            );
            this.router.navigate(['/apps']);
            this.analyticsTracker.trackEvent(AnalyticsEvents.LLM_CONFIG_SAVED, {
              provider: provider,
              model: latestConfigValues.model || latestConfigValues.deployment,
              analyticsEnabled: analyticsEnabled,
              source: AnalyticsEventSource.LLM_SETTINGS,
              status: AnalyticsEventStatus.SUCCESS
            })
          });
        });
      } else {
        // Show error but keep the form values for correction
        this.errorMessage = 'Connection Failed! Please verify your model credentials.';
        this.analyticsTracker.trackEvent(AnalyticsEvents.LLM_CONFIG_SAVED, {
          provider: provider,
          model: latestConfigValues.model || latestConfigValues.deployment,
          analyticsEnabled: analyticsEnabled,
          source: AnalyticsEventSource.LLM_SETTINGS,
          status: AnalyticsEventStatus.FAILURE
        });
        this.cdr.markForCheck();
      }
    }).catch((error) => {
      this.errorMessage = 'LLM configuration verification failed. Please verify your credentials.';
      this.cdr.markForCheck();
      this.analyticsTracker.trackEvent(AnalyticsEvents.LLM_CONFIG_SAVED, {
        provider: provider,
        model: latestConfigValues.model || latestConfigValues.deployment,
        analyticsEnabled: analyticsEnabled,
        source: AnalyticsEventSource.LLM_SETTINGS,
        status: AnalyticsEventStatus.FAILURE
      });
    });
  }
  async selectRootDirectory(): Promise<void> {
    const response = await this.electronService.openDirectory();
    this.logger.debug(response);
    if (response.length > 0) {
      localStorage.setItem(APP_CONSTANTS.WORKING_DIR, response[0]);
      const currentConfig =
        (await this.electronService.getStoreValue('APP_CONFIG')) || {};
      const updatedConfig = { ...currentConfig, directoryPath: response[0] };
      await this.electronService.setStoreValue('APP_CONFIG', updatedConfig);

      this.logger.debug('===>', this.router.url);
      if (this.router.url === '/apps') {
        await this.electronService.reloadApp();
      } else {
        await this.router.navigate(['/apps']);
      }
    }
  }

  openFolderSelector() {
    this.selectRootDirectory().then();
  }

  onProviderChange() {
    this.subscriptions.add(
      this.selectedProvider.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((provider) => {
          this.configForm.get('provider')?.setValue(provider, { emitEvent: true });
          this.errorMessage = '';
          this.checkForChanges();
          this.cdr.detectChanges();
        }),
    );
  }

  onAnalyticsToggleChange() {
    this.subscriptions.add(
      this.analyticsEnabled.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((enabled) => {
          this.checkForChanges();
          this.cdr.markForCheck();
        }),
    );
  }

  onAutoUpdateToggleChange() {
    this.subscriptions.add(
      this.autoUpdateEnabled.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((enabled) => {
          this.checkForChanges();
          this.cdr.markForCheck();
        }),
    );
  }

  checkForUpdates() {
    this.electronService.checkForUpdates(true);
  }

  checkForChanges() {
    const formValue = this.configForm.value;
    const currentConfig = this.currentLLMConfig.providerConfigs[this.currentLLMConfig.activeProvider]?.config;
    
    // Compare provider
    let hasProviderChanged = formValue.provider !== this.initialProvider;
    
    // Compare config fields
    let hasConfigChanged = false;
    if (formValue.config && currentConfig) {
      const configKeys = new Set([
        ...Object.keys(formValue.config),
        ...Object.keys(currentConfig)
      ]);
      
      for (const key of configKeys) {
        if (formValue.config[key as keyof typeof formValue.config] !== 
            currentConfig[key as keyof typeof currentConfig]) {
          hasConfigChanged = true;
          break;
        }
      }
    }

    this.hasChanges =
      hasProviderChanged ||
      hasConfigChanged ||
      this.analyticsEnabled.value !== this.initialAnalyticsState || 
      this.autoUpdateEnabled.value !== this.initialAutoUpdateState;
  }

  updateAnalyticsState(enabled: boolean): void {
    setAnalyticsToggleState(enabled);
    this.electronService.setStoreValue('analyticsEnabled', enabled);
    if (enabled) {
      this.analyticsTracker.initAnalytics();
    }
  }

  navigateToHome() {
    if (this.hasChanges) {
      this.dialogService
        .confirm({
          title: CONFIRMATION_DIALOG.UNSAVED_CHANGES.TITLE,
          description: CONFIRMATION_DIALOG.UNSAVED_CHANGES.DESCRIPTION,
          cancelButtonText: CONFIRMATION_DIALOG.UNSAVED_CHANGES.CANCEL_BUTTON_TEXT,
          confirmButtonText: CONFIRMATION_DIALOG.UNSAVED_CHANGES.PROCEED_BUTTON_TEXT,
        })
        .subscribe((confirmed: boolean) => {
          if (!confirmed) {
            this.analyticsEnabled.setValue(this.initialAnalyticsState);
            this.router.navigate(['/apps']);
          }
        });
      return;
    }
  }

  logout() {
    // Close the settings modal and open the logout confirmation dialog
    this.dialogService
      .confirm({
        title: CONFIRMATION_DIALOG.LOGOUT.TITLE,
        description: CONFIRMATION_DIALOG.LOGOUT.DESCRIPTION,
        cancelButtonText: CONFIRMATION_DIALOG.LOGOUT.CANCEL_BUTTON_TEXT,
        confirmButtonText: CONFIRMATION_DIALOG.LOGOUT.PROCEED_BUTTON_TEXT,
      })
      .subscribe((confirmed: boolean) => {
        if (confirmed) this.startupService.logout();
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onTabChange(tab: 'general'| 'about') {
    this.activeTab = tab;
  }

  getAboutContent() {
    const { version, currentYear } = this.getAboutInfo();

    return {
      version,
      currentYear,
      appName: this.appName
    };
  }
}
