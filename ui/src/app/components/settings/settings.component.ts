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
import {
  AvailableProviders,
  ProviderModelMap,
  HIDE_MODEL_DROPDOWN,
} from '../../constants/llm.models.constants';
import {
  SetLLMConfig,
  SyncLLMConfig,
} from '../../store/llm-config/llm-config.actions';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { NgForOf, NgIf } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { ButtonComponent } from '../core/button/button.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import {
  APP_CONSTANTS,
  CONFIRMATION_DIALOG,
} from '../../constants/app.constants';
import { environment } from 'src/environments/environment';
import { ElectronService } from 'src/app/services/electron/electron.service';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { LLM_PROVIDER_CONFIGS, ProviderField } from '../../constants/llm-provider-config';
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
  ],
    providers: [
      provideIcons({ 
        heroExclamationTriangle
      })
    ]
  
})
export class SettingsComponent implements OnInit, OnDestroy {
  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig,
  );
  currentLLMConfig!: LLMConfigModel;
  availableProviders = AvailableProviders;
  filteredModels: string[] = [];
  currentProviderFields: ProviderField[] = [];
  hideModelDropdown: boolean = false;
  configForm!: FormGroup;
  selectedModel: FormControl = new FormControl();
  selectedProvider: FormControl = new FormControl();
  analyticsEnabled: FormControl = new FormControl();
  errorMessage: string = '';
  hasChanges: boolean = false;
  workingDir: string | null;
  appName = environment.ThemeConfiguration.appName;
  private subscriptions: Subscription = new Subscription();
  private initialModel: string = '';
  private initialProvider: string = '';
  private initialAnalyticsState: boolean = false;
  protected themeConfiguration = environment.ThemeConfiguration;

  electronService = inject(ElectronService);
  logger = inject(NGXLogger);
  router = inject(Router);
  dialog = inject(MatDialog);
  version: string = environment.APP_VERSION;
  currentYear = new Date().getFullYear();
  analyticsWarning: string = '';

  constructor(
    private modalRef: MatDialogRef<SettingsComponent>,
    private store: Store,
    private authService: AuthService,
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private analyticsTracker: AnalyticsTracker,
    private core: CoreService
  ) {
    this.workingDir = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    this.initForm();
  }

  private initForm() {
    this.configForm = this.fb.group({
      provider: ['', Validators.required],
      model: [''],
      config: this.fb.group({})
    });
  }

  private updateConfigFields(provider: string) {
    const providerConfig = LLM_PROVIDER_CONFIGS[provider];
    if (!providerConfig) return;

    this.currentProviderFields = providerConfig.fields;
    if (!this.configForm) return;
    const configGroup = this.configForm.get('config') as FormGroup;
    if (!configGroup) return;

    // Remove all existing controls
    Object.keys(configGroup.controls).forEach(key => {
      configGroup.removeControl(key);
    });

    // Add new controls based on provider fields
    providerConfig.fields.forEach(field => {
      configGroup.addControl(
        field.name,
        this.fb.control(
          field.defaultValue !== undefined ? field.defaultValue : '',
          field.required ? [Validators.required] : []
        )
      );
    });
  }

  ngOnInit(): void {
    this.core.getAppConfig().subscribe({
      next: (config: any) => {
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
      },
      error: (error: any) => {
        console.error('Failed to fetch PostHog configuration:', error);
      },
    });
    this.subscriptions.add(
      this.llmConfig$.subscribe((config) => {
        this.currentLLMConfig = config;
        this.updateFilteredModels(config?.provider);
        this.selectedModel.setValue(config.model);
        this.selectedProvider.setValue(config.provider);
        this.initialModel = config.model;
        this.initialProvider = config.provider;
        this.hasChanges = false;
      }),
    );

    const analyticsState = getAnalyticsToggleState();
    this.analyticsEnabled.setValue(analyticsState);
    this.initialAnalyticsState = analyticsState;

    this.onModelChange();
    this.onProviderChange();
    this.onAnalyticsToggleChange();

    if (this.configForm) {
      // Set initial default values
      const defaultProvider = AvailableProviders[0].key;
      const defaultModel = ProviderModelMap[defaultProvider][0];
      
      this.configForm.patchValue({
        provider: defaultProvider,
        model: defaultModel,
        config: {}
      });

      this.subscriptions.add(
        this.llmConfig$.subscribe((config) => {
          this.currentLLMConfig = config;
          
          // If config is empty or invalid, use defaults
          const provider = config?.provider || defaultProvider;
          const model = config?.model || ProviderModelMap[provider][0];
          
          this.updateFilteredModels(provider);
          this.updateConfigFields(provider);
          
          // Then patch all values including config
          this.configForm?.patchValue({
            provider,
            model,
            config: config?.config || {}
          }, { emitEvent: false });
          
          this.hasChanges = false;
        }),
      );

      this.subscriptions.add(
        this.configForm.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
          this.hasChanges = true;
          this.errorMessage = '';
        })
      );

      const providerControl = this.configForm.get('provider');
      const modelControl = this.configForm.get('model');
      if (providerControl && modelControl) {
        this.subscriptions.add(
          providerControl.valueChanges.subscribe(provider => {
            this.hideModelDropdown = HIDE_MODEL_DROPDOWN.includes(provider);
            this.updateFilteredModels(provider);
            this.updateConfigFields(provider);
            
            // Update model field validation and value based on provider
            if (this.hideModelDropdown) {
              modelControl.clearValidators();
              modelControl.setValue('');
            } else {
              modelControl.setValidators(Validators.required);
              modelControl.setValue(ProviderModelMap[provider][0]);
            }
            modelControl.updateValueAndValidity();
          })
        );
      }
    }
  }

  onSave() {
    if (!this.configForm?.valid) return;
    const analyticsEnabled = this.analyticsEnabled.value;

    if (analyticsEnabled !== this.initialAnalyticsState) {
      this.updateAnalyticsState(analyticsEnabled);
      this.initialAnalyticsState = analyticsEnabled;
    }

    const formValue = this.configForm.value;
    const provider = formValue.provider;
    // Use form model value or let the handler determine it from config
    const model = this.hideModelDropdown ? '' : formValue.model;

    // Store current values before verification
    const previousConfig = {
      provider: this.currentLLMConfig.provider,
      model: this.currentLLMConfig.model,
      config: this.currentLLMConfig.config
    };

    this.electronService.verifyLLMConfig(provider, model, formValue.config).then((response) => {
      if (response.status === 'success') {
        const newConfig = {
          ...this.currentLLMConfig,
          provider: formValue.provider,
          model: response.model, // Use the actual model ID from the handler
          config: formValue.config
        };
        console.log("New Config", newConfig);
        this.store.dispatch(new SetLLMConfig(newConfig)).subscribe(() => {
          this.store.dispatch(new SyncLLMConfig()).subscribe(async () => {
            await this.electronService.setStoreValue('llmConfig', newConfig);
            const providerDisplayName =
              this.availableProviders.find((p) => p.key === provider)
                ?.displayName || provider;
            this.toasterService.showSuccess(
              `${providerDisplayName} : ${response.model} is configured successfully.`,
            );
            this.modalRef.close(true);
            this.analyticsTracker.trackEvent(AnalyticsEvents.LLM_CONFIG_SAVED, {
              provider: provider,
              model: model,
              analyticsEnabled: analyticsEnabled,
              source: AnalyticsEventSource.LLM_SETTINGS,
              status: AnalyticsEventStatus.SUCCESS
            })
          });
        });
      } else {
        // On verification failure, revert to previous working configuration
        this.store.dispatch(new SetLLMConfig(previousConfig)).subscribe(() => {
          this.store.dispatch(new SyncLLMConfig()).subscribe(() => {
            this.errorMessage = 'Connection Failed! Please verify your model credentials.';
            this.analyticsTracker.trackEvent(AnalyticsEvents.LLM_CONFIG_SAVED, {
              provider: provider,
              model: model,
              analyticsEnabled: analyticsEnabled,
              source: AnalyticsEventSource.LLM_SETTINGS,
              status: AnalyticsEventStatus.FAILURE
            })
            this.cdr.markForCheck();
          });
        });
      }
    }).catch((error) => {
      this.errorMessage = 'LLM configuration verification failed. Please verify your credentials.';
      this.cdr.markForCheck();
      this.analyticsTracker.trackEvent(AnalyticsEvents.LLM_CONFIG_SAVED, {
        provider: provider,
        model: model,
        analyticsEnabled: analyticsEnabled,
        source: AnalyticsEventSource.LLM_SETTINGS,
        status: AnalyticsEventStatus.FAILURE
      })
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
    this.modalRef.close(true);
  }

  onModelChange() {
    this.subscriptions.add(
      this.selectedModel.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((res) => {
          this.updateFilteredModels(this.selectedProvider.value);
          this.errorMessage = '';
          this.checkForChanges();
          this.cdr.markForCheck();
        }),
    );
  }

  onProviderChange() {
    this.subscriptions.add(
      this.selectedProvider.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((res) => {
          this.updateFilteredModels(res);
          this.selectedModel.setValue(ProviderModelMap[res][0]);
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

  checkForChanges() {
    this.hasChanges =
      this.selectedModel.value !== this.initialModel ||
      this.selectedProvider.value !== this.initialProvider ||
      this.analyticsEnabled.value !== this.initialAnalyticsState;
  }

  updateFilteredModels(provider: string) {
    this.filteredModels = ProviderModelMap[provider] || [];
  }

  updateAnalyticsState(enabled: boolean): void {
    setAnalyticsToggleState(enabled);
    if (enabled) {
      this.analyticsTracker.initAnalytics();
    }
  }

  closeModal() {
    this.analyticsEnabled.setValue(this.initialAnalyticsState);
    
    this.store.dispatch(
      new SetLLMConfig({
        ...this.currentLLMConfig,
        model: this.initialModel,
        provider: this.initialProvider,
      }),
    );
    this.modalRef.close(false);
  }

  logout() {
    // Close the settings modal and open the logout confirmation dialog
    this.modalRef.close(true);

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: {
        title: CONFIRMATION_DIALOG.LOGOUT.TITLE,
        description: CONFIRMATION_DIALOG.LOGOUT.DESCRIPTION,
        cancelButtonText: CONFIRMATION_DIALOG.LOGOUT.CANCEL_BUTTON_TEXT,
        proceedButtonText: CONFIRMATION_DIALOG.LOGOUT.PROCEED_BUTTON_TEXT,
      },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (!res) this.authService.logout();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
