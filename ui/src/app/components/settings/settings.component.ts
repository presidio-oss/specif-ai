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
} from '../../constants/llm.models.constants';
import {
  SetLLMConfig,
  SyncLLMConfig,
} from '../../store/llm-config/llm-config.actions';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';
import { NgForOf, NgIf } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { ButtonComponent } from '../core/button/button.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { CONFIRMATION_DIALOG } from '../../constants/app.constants';
import { environment } from 'src/environments/environment';

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
})
export class SettingsComponent implements OnInit, OnDestroy {
  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig,
  );
  currentLLMConfig!: LLMConfigModel;
  availableProviders = AvailableProviders;
  filteredModels: string[] = [];
  selectedModel: FormControl = new FormControl();
  selectedProvider: FormControl = new FormControl();
  errorMessage: string = '';
  hasChanges: boolean = false;
  private subscriptions: Subscription = new Subscription();
  private initialModel: string = '';
  private initialProvider: string = '';
  protected themeConfiguration = environment.ThemeConfiguration;

  dialog = inject(MatDialog);
  version: string = environment.APP_VERSION;
  currentYear = new Date().getFullYear();

  constructor(
    private modalRef: MatDialogRef<SettingsComponent>,
    private store: Store,
    private authService: AuthService,
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
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
    this.onModelChange();
    this.onProviderChange();
  }

  onModelChange() {
    this.subscriptions.add(
      this.selectedModel.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe((res) => {
          this.updateFilteredModels(this.selectedProvider.value);
          this.errorMessage = '';
          this.hasChanges =
            this.selectedModel.value !== this.initialModel ||
            this.selectedProvider.value !== this.initialProvider;
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
          this.hasChanges =
            this.selectedModel.value !== this.initialModel ||
            this.selectedProvider.value !== this.initialProvider;
          this.cdr.detectChanges();
        }),
    );
  }

  updateFilteredModels(provider: string) {
    this.filteredModels = ProviderModelMap[provider] || [];
  }

  closeModal() {
    this.store.dispatch(
      new SetLLMConfig({
        ...this.currentLLMConfig,
        model: this.initialModel,
        provider: this.initialProvider,
      }),
    );
    this.modalRef.close(false);
  }

  onSave() {
    const provider = this.selectedProvider.value;
    const model = this.selectedModel.value;

    this.authService.verifyProviderConfig(provider, model).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          const newConfig = {
            ...this.currentLLMConfig,
            model: model,
            provider: provider,
          };
          this.store.dispatch(new SetLLMConfig(newConfig)).subscribe(() => {
            this.store.dispatch(new SyncLLMConfig()).subscribe(() => {
              const providerDisplayName =
                this.availableProviders.find((p) => p.key === provider)
                  ?.displayName || provider;
              this.toasterService.showSuccess(
                `${providerDisplayName} : ${model} is configured successfully.`,
              );
              this.modalRef.close(true);
            });
          });
        } else {
          this.errorMessage =
            'Connection Failed! Please verify your model credentials in the backend configuration.';
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        this.errorMessage = 'LLM configuration verification failed. Please contact your admin for technical support.';
        this.cdr.markForCheck();
      },
    });
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
