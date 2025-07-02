import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AccordionComponent } from '../accordion/accordion.component';
import { JiraIntegrationComponent } from './jira-integration/jira-integration.component';
import { AdoIntegrationComponent } from './ado-integration/ado-integration.component';
import { PmoIntegrationConfigService } from '../../services/pmo-integration-config.service';
import {
  PmoIntegrationConfig,
  PmoConnectionStatus,
  PmoIntegrationEvent,
} from '../../types/pmo-integration.types';
import { IProjectMetadata } from '../../model/interfaces/projects.interface';

@Component({
  selector: 'app-pmo-integration',
  templateUrl: './pmo-integration.component.html',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    NgFor,
    ReactiveFormsModule,
    AccordionComponent,
    JiraIntegrationComponent,
    AdoIntegrationComponent,
  ],
})
export class PmoIntegrationComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;
  @Input() projectMetadata!: IProjectMetadata;
  @Input() isAccordionOpen: boolean = false;
  @Input() selectedIntegration: string | null = null;
  @Output() toggleAccordion = new EventEmitter<void>();

  selectedIntegrationType = new FormControl<string>('');
  private destroy$ = new Subject<void>();

  availableIntegrations = signal<PmoIntegrationConfig[]>([]);
  private connectionStatus = signal<PmoConnectionStatus>({});
  private selectedType = signal<string>('');

  readonly isConnected = computed(() => {
    const currentType = this.selectedType();
    return currentType ? this.connectionStatus()[currentType] || false : false;
  });

  readonly selectedIntegrationConfig = computed(() => {
    const currentType = this.selectedType();
    return this.availableIntegrations().find(
      (config) => config.id === currentType,
    );
  });

  readonly connectedPmoTool = computed(() => {
    const status = this.connectionStatus();
    const connectedTool = Object.keys(status).find((key) => status[key]);
    if (connectedTool) {
      return connectedTool;
    }

    return this.projectMetadata?.integration?.selectedPmoTool || null;
  });

  readonly hasPmoToolSelected = computed(() => {
    return this.connectedPmoTool() !== null;
  });

  readonly selectedPmoConfig = computed(() => {
    const connectedTool = this.connectedPmoTool();
    return connectedTool
      ? this.availableIntegrations().find(
          (config) => config.id === connectedTool,
        )
      : null;
  });

  readonly accordionTitle = computed(() => {
    const selectedConfig = this.selectedPmoConfig();
    return selectedConfig
      ? `${selectedConfig.displayName} Integration`
      : 'PMO Integration';
  });

  readonly accordionIcon = computed(() => {
    const selectedConfig = this.selectedPmoConfig();
    return selectedConfig
      ? selectedConfig.logoPath
      : './assets/img/logo/pmo_logo.svg';
  });

  constructor(private configService: PmoIntegrationConfigService) {}

  ngOnInit(): void {
    this.initializeIntegrations();
    this.setupFormSubscription();
    this.setDefaultSelection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeIntegrations(): void {
    const integrations = this.configService.getEnabledIntegrations();
    this.availableIntegrations.set(integrations);

    const initialStatus: PmoConnectionStatus = {};
    integrations.forEach((integration) => {
      initialStatus[integration.id] = false;
    });
    this.connectionStatus.set(initialStatus);
  }

  private setupFormSubscription(): void {
    this.selectedIntegrationType.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value) {
          this.selectedType.set(value);
        }
      });
  }

  private setDefaultSelection(): void {
    const integrations = this.availableIntegrations();
    const connectedPmoTool = this.connectedPmoTool();

    if (connectedPmoTool) {
      this.selectedIntegrationType.setValue(connectedPmoTool);
      this.selectedType.set(connectedPmoTool);
    } else if (integrations.length > 0) {
      const defaultIntegration = this.selectedIntegration ? this.selectedIntegration : integrations[0].id;
      this.selectedIntegrationType.setValue(defaultIntegration);
      this.selectedType.set(defaultIntegration);
    }
  }


  onConnectionStatusChange(event: PmoIntegrationEvent): void {
    const availableIntegrations = this.availableIntegrations();
    const isValidIntegrationType = availableIntegrations.some(
      (integration) => integration.id === event.type,
    );

    if (!isValidIntegrationType) {
      console.error(
        `Unknown integration type '${event.type}'. Valid types are: ${availableIntegrations
          .map((integration) => integration.id)
          .join(', ')}`,
      );
      return;
    }

    this.connectionStatus.update((status) => ({
      ...status,
      [event.type]: event.isConnected,
    }));
  }

  createConnectionStatusHandler(integrationType: string) {
    return (isConnected: boolean) =>
      this.onConnectionStatusChange({ type: integrationType, isConnected });
  }

  isIntegrationSelected(integrationId: string): boolean {
    return this.selectedType() === integrationId;
  }
}
