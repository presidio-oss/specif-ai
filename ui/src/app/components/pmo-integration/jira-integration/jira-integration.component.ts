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
  JiraCredentials,
} from 'src/app/model/interfaces/projects.interface';
import { IntegrationCredentialsService } from '../../../services/integration-credentials/integration-credentials.service';
import { APP_MESSAGES } from '../../../constants/app.constants';
import { APP_INTEGRATIONS } from '../../../constants/toast.constant';
import { NGXLogger } from 'ngx-logger';
import {
  getJiraTokenInfo,
  storeJiraToken,
  resetJiraToken,
} from '../../../integrations/jira/jira.utils';

@Component({
  selector: 'app-jira-integration',
  templateUrl: './jira-integration.component.html',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, InputFieldComponent, ButtonComponent],
})
export class JiraIntegrationComponent implements PmoIntegrationBase, OnInit {
  @Input({ required: true }) projectId!: string;
  @Input({ required: true }) projectMetadata!: IProjectMetadata;
  @Output() connectionStatusChange = new EventEmitter<boolean>();

  private readonly store = inject(Store);
  private readonly toast = inject(ToasterService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly electronService = inject(ElectronService);
  private readonly logger = inject(NGXLogger);
  private readonly integrationCredService = inject(
    IntegrationCredentialsService,
  );

  protected readonly APP_MESSAGES = APP_MESSAGES;

  jiraForm: FormGroup;
  editButtonDisabled = signal<boolean>(false);
  isConnected = signal<boolean>(false);
  isProcessing = signal<boolean>(false);

  buttonDisabled = computed(
    () =>
      (!this.isConnected() && this.editButtonDisabled()) || this.isProcessing(),
  );

  constructor() {
    this.jiraForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeFormState();
    this.setupFormValidation();
    this.initializeConnectionState();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      jiraProjectKey: ['', [Validators.required, Validators.minLength(1)]],
      clientId: ['', [Validators.required, Validators.minLength(1)]],
      clientSecret: ['', [Validators.required, Validators.minLength(1)]],
      redirectUrl: ['', [Validators.required, Validators.minLength(1)]],
      prdWorkItemType: ['Epic', [Validators.required]],
      userStoryWorkItemType: ['Story', [Validators.required]],
      taskWorkItemType: ['Sub-task', [Validators.required]],
    });
  }

  private async initializeFormState(): Promise<void> {
    const credentials =
      await this.integrationCredService.getCredentials<JiraCredentials>(
        this.projectMetadata.name,
        this.projectId,
        'jira',
      );
    const jiraIntegration = this.projectMetadata?.integration?.jira;

    if (credentials && jiraIntegration) {
      this.jiraForm.patchValue({
        jiraProjectKey: credentials.jiraProjectKey || '',
        clientId: credentials.clientId || '',
        clientSecret: credentials.clientSecret || '',
        redirectUrl: credentials.redirectUrl || '',
        prdWorkItemType: jiraIntegration.workItemTypeMapping?.['PRD'] || 'Epic',
        userStoryWorkItemType:
          jiraIntegration.workItemTypeMapping?.['US'] || 'Story',
        taskWorkItemType:
          jiraIntegration.workItemTypeMapping?.['TASK'] || 'Sub-task',
      });
    }

    if (this.isConnected()) {
      this.jiraForm.disable();
    }
  }

  private setupFormValidation(): void {
    this.editButtonDisabled.set(!this.jiraForm.valid);
    this.jiraForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.editButtonDisabled.set(!this.jiraForm.valid);
      });
  }

  private async initializeConnectionState(): Promise<void> {
    const tokenInfo = getJiraTokenInfo(this.projectId);
    const credentials =
      await this.integrationCredService.getCredentials<JiraCredentials>(
        this.projectMetadata.name,
        this.projectId,
        'jira',
      );

    const isConnected = !!(
      credentials &&
      tokenInfo.projectKey === credentials.jiraProjectKey &&
      !!tokenInfo.token &&
      this.isTokenValid()
    );

    this.isConnected.set(isConnected);
    this.connectionStatusChange.emit(this.isConnected());
  }

  private isTokenValid(): boolean {
    const { token, tokenExpiration } = getJiraTokenInfo(this.projectId);
    return (
      !!token && !!tokenExpiration && new Date() < new Date(tokenExpiration)
    );
  }

  async onConnect(): Promise<void> {
    if (!this.jiraForm.valid || this.isProcessing()) {
      return;
    }

    this.isProcessing.set(true);
    const formData = this.jiraForm.getRawValue();

    const oauthParams = {
      clientId: formData.clientId,
      clientSecret: formData.clientSecret,
      redirectUri: formData.redirectUrl,
    };

    try {
      const authResponse =
        await this.electronService.startJiraOAuth(oauthParams);
      storeJiraToken(authResponse, formData.jiraProjectKey, this.projectId);
      this.saveJiraData(formData);
    } catch (error) {
      this.logger.error('Error during Jira OAuth process:', error);
      this.toast.showError(APP_INTEGRATIONS.JIRA.ERROR);
      this.isProcessing.set(false);
    }
  }

  onDisconnect(): void {
    if (this.isProcessing()) {
      return;
    }

    this.isProcessing.set(true);
    try {
      resetJiraToken(this.projectId);
      this.jiraForm.enable();
      this.isConnected.set(false);
      this.connectionStatusChange.emit(false);
      this.toast.showSuccess(APP_INTEGRATIONS.JIRA.DISCONNECT);
    } finally {
      this.isProcessing.set(false);
    }
  }

  private async saveJiraData(formData: any): Promise<void> {
    try {
      const credentials: JiraCredentials = {
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        jiraProjectKey: formData.jiraProjectKey,
        redirectUrl: formData.redirectUrl,
      };

      await this.integrationCredService.saveCredentials(
        this.projectMetadata.name,
        this.projectId,
        'jira',
        credentials,
      );

      const workItemTypeMapping = {
        PRD: formData.prdWorkItemType,
        US: formData.userStoryWorkItemType,
        TASK: formData.taskWorkItemType,
      };

      const updatedMetadata = this.createUpdatedMetadata({
        selectedPmoTool: 'jira',
        jira: {
          workItemTypeMapping: workItemTypeMapping,
        },
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
            this.toast.showError(APP_INTEGRATIONS.JIRA.ERROR);
          },
        });
    } catch (error) {
      this.logger.error('Error saving JIRA credentials:', error);
      this.toast.showError(APP_INTEGRATIONS.JIRA.ERROR);
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
    this.jiraForm.disable();
    this.isConnected.set(true);
    this.connectionStatusChange.emit(true);
    this.toast.showSuccess(APP_INTEGRATIONS.JIRA.SUCCESS);
  }

  getButtonText(): string {
    if (this.isProcessing()) {
      return this.isConnected() ? 'Disconnecting...' : 'Connecting...';
    }
    return this.isConnected() ? 'Disconnect' : 'Connect';
  }
}
