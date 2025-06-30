import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  DestroyRef,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormBuilder,
} from '@angular/forms';
import { NGXLogger } from 'ngx-logger';
import { finalize } from 'rxjs/operators';
import { NgIf } from '@angular/common';
import { Store } from '@ngxs/store';
import { InputFieldComponent } from '../../core/input-field/input-field.component';
import { PmoIntegrationBase } from '../../../interfaces/pmo-integration-base.interface';
import { ButtonComponent } from '../../core/button/button.component';
import { UpdateMetadata } from '../../../store/projects/projects.actions';
import { ToasterService } from '../../../services/toaster/toaster.service';
import { ElectronService } from '../../../electron-bridge/electron.service';
import {
  IProjectMetadata,
  AdoIntegrationConfig,
  WorkItemTypeMapping,
} from '../../../model/interfaces/projects.interface';
import { APP_MESSAGES } from '../../../constants/app.constants';
import { APP_INTEGRATIONS } from '../../../constants/toast.constant';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ado-integration',
  templateUrl: './ado-integration.component.html',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, InputFieldComponent, ButtonComponent],
})
export class AdoIntegrationComponent implements PmoIntegrationBase, OnInit {
  @Input({ required: true }) projectId!: string;
  @Input({ required: true }) projectMetadata!: IProjectMetadata;
  @Output() connectionStatusChange = new EventEmitter<boolean>();

  private readonly store = inject(Store);
  private readonly toast = inject(ToasterService);
  private readonly fb = inject(FormBuilder);
  private readonly logger = inject(NGXLogger);
  private readonly destroyRef = inject(DestroyRef);
  private readonly electronService = inject(ElectronService);

  protected readonly APP_MESSAGES = APP_MESSAGES;
  protected readonly environment = environment;

  adoForm: FormGroup;
  editButtonDisabled = signal<boolean>(false);
  isConnected = signal<boolean>(false);
  isProcessing = signal<boolean>(false);

  buttonDisabled = computed(
    () =>
      (!this.isConnected() && this.editButtonDisabled()) || this.isProcessing(),
  );

  constructor() {
    this.adoForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeFormState();
    this.setupFormValidation();
    this.initializeConnectionState();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      organization: ['', [Validators.required, Validators.minLength(1)]],
      projectName: ['', [Validators.required, Validators.minLength(1)]],
      personalAccessToken: ['', [Validators.required, Validators.minLength(1)]],
      prdWorkItemType: ['', [Validators.required]],
      userStoryWorkItemType: ['', [Validators.required]],
      taskWorkItemType: ['', [Validators.required]],
    });
  }

  private initializeFormState(): void {
    const adoIntegration = this.projectMetadata?.integration?.ado;

    if (adoIntegration) {
      this.adoForm.patchValue({
        organization: adoIntegration.organization || '',
        projectName: adoIntegration.projectName || '',
        personalAccessToken: adoIntegration.personalAccessToken || '',
        prdWorkItemType: adoIntegration.workItemTypeMapping?.['PRD'] || '',
        userStoryWorkItemType: adoIntegration.workItemTypeMapping?.['US'] || '',
        taskWorkItemType: adoIntegration.workItemTypeMapping?.['TASK'] || '',
      });
    }

    if (this.isConnected()) {
      this.adoForm.disable();
    }
  }

  private setupFormValidation(): void {
    this.editButtonDisabled.set(!this.adoForm.valid);
    this.adoForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.editButtonDisabled.set(!this.adoForm.valid);
      });
  }

  private async initializeConnectionState(): Promise<void> {
    const adoIntegration = this.projectMetadata.integration?.ado;

    if (
      adoIntegration?.organization &&
      adoIntegration?.projectName &&
      adoIntegration?.personalAccessToken
    ) {
      try {
        const validationResult =
          await this.electronService.validateAdoCredentials(
            adoIntegration.organization,
            adoIntegration.projectName,
            adoIntegration.personalAccessToken,
          );

        this.isConnected.set(validationResult.isValid);
      } catch (error) {
        this.isConnected.set(false);
      }
    } else {
      this.isConnected.set(false);
    }

    this.connectionStatusChange.emit(this.isConnected());
  }

  onConnect(): void {
    if (!this.adoForm.valid || this.isProcessing()) {
      return;
    }

    this.isProcessing.set(true);
    const formData = this.adoForm.getRawValue();
    this.saveAdoData(formData);
  }

  onDisconnect(): void {
    if (this.isProcessing()) {
      return;
    }

    this.isProcessing.set(true);
    const updatedMetadata = this.createUpdatedMetadata({ ado: undefined });

    this.store
      .dispatch(new UpdateMetadata(this.projectMetadata.id, updatedMetadata))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isProcessing.set(false)),
      )
      .subscribe({
        next: () => {
          this.handleDisconnectSuccess();
        },
        error: () => {
          this.toast.showError(APP_INTEGRATIONS.ADO.ERROR);
        },
      });
  }

  private async saveAdoData(formData: any): Promise<void> {
    try {
      const validationResult =
        await this.electronService.validateAdoCredentials(
          formData.organization,
          formData.projectName,
          formData.personalAccessToken,
        );

      if (!validationResult.isValid) {
        this.toast.showError(APP_INTEGRATIONS.ADO.VALIDATION_ERROR);
        this.isProcessing.set(false);
        return;
      }

      const workflowMapping: WorkItemTypeMapping = {
        PRD: formData.prdWorkItemType,
        US: formData.userStoryWorkItemType,
        TASK: formData.taskWorkItemType,
      };

      const adoConfig: AdoIntegrationConfig = {
        organization: formData.organization,
        projectName: formData.projectName,
        personalAccessToken: formData.personalAccessToken,
        workItemTypeMapping: workflowMapping,
      };

      const updatedMetadata = this.createUpdatedMetadata({
        selectedPmoTool: 'ado',
        ado: adoConfig,
      });

      this.store
        .dispatch(new UpdateMetadata(this.projectMetadata.id, updatedMetadata))
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.isProcessing.set(false)),
        )
        .subscribe({
          next: () => {
            this.handleConnectSuccess();
          },
          error: () => {
            this.toast.showError(APP_INTEGRATIONS.ADO.ERROR);
          },
        });
    } catch (error) {
      this.logger.error(
        'Error validating ADO credentials during connect:',
        error,
      );
      this.toast.showError('Failed to validate ADO credentials');
      this.isProcessing.set(false);
    }
  }

  private createUpdatedMetadata(
    integrationUpdates: Partial<IProjectMetadata['integration']>,
  ) {
    return {
      ...this.projectMetadata,
      integration: {
        ...this.projectMetadata.integration,
        ...integrationUpdates,
      },
    };
  }

  private handleConnectSuccess(): void {
    this.adoForm.disable();
    this.isConnected.set(true);
    this.connectionStatusChange.emit(true);
    this.toast.showSuccess(APP_INTEGRATIONS.ADO.SUCCESS);
  }

  private handleDisconnectSuccess(): void {
    this.adoForm.enable();
    this.isConnected.set(false);
    this.connectionStatusChange.emit(false);
    this.toast.showSuccess(APP_INTEGRATIONS.ADO.DISCONNECT);
  }

  getButtonText(): string {
    if (this.isProcessing()) {
      return this.isConnected() ? 'Disconnecting...' : 'Connecting...';
    }
    return this.isConnected() ? 'Disconnect' : 'Connect';
  }
}
