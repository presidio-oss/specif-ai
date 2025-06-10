import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import mermaid from 'mermaid';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import {
  GetProjectFiles,
  UpdateMetadata,
} from '../../store/projects/projects.actions';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { getDescriptionFromInput } from '../../utils/common.utils';
import {
  Observable,
  Subject,
  distinctUntilChanged,
  first,
  takeUntil,
} from 'rxjs';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { MultiUploadComponent } from '../../components/multi-upload/multi-upload.component';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArchiveBox,
  heroLink,
  heroBriefcase,
  heroSquares2x2,
  heroCube,
  heroWindow,
  heroSquare3Stack3d,
  heroChevronDown,
  heroChevronUp,
  heroServerStack,
} from '@ng-icons/heroicons/outline';
import { DocumentListingComponent } from '../../components/document-listing/document-listing.component';
import { APP_MESSAGES, FILTER_STRINGS } from '../../constants/app.constants';
import { APP_INFO_COMPONENT_ERROR_MESSAGES } from '../../constants/messages.constants';
import { AccordionComponent } from '../../components/accordion/accordion.component';
import { ToasterService } from '../../services/toaster/toaster.service';
import { NGXLogger } from 'ngx-logger';
import { FileTypeEnum, IconPairingEnum } from '../../model/enum/file-type.enum';
import { SetChatSettings } from 'src/app/store/chat-settings/chat-settings.action';
import { ChatSettings } from 'src/app/model/interfaces/ChatSettings';
import { ChatSettingsState } from 'src/app/store/chat-settings/chat-settings.state';
import { RequirementTypeEnum } from 'src/app/model/enum/requirement-type.enum';
import { APP_INTEGRATIONS } from 'src/app/constants/toast.constant';
import {
  getJiraTokenInfo,
  storeJiraToken,
  resetJiraToken,
} from '../../integrations/jira/jira.utils';
import { ElectronService } from 'src/app/electron-bridge/electron.service';
import { FeatureService } from '../../services/feature/feature.service';
import { LLMConfigModel } from 'src/app/model/interfaces/ILLMConfig';
import { LLMConfigState } from 'src/app/store/llm-config/llm-config.state';
import { McpServersListComponent } from '../../components/mcp/mcp-servers-list/mcp-servers-list.component';
import { McpIntegrationConfiguratorComponent } from '../../components/mcp-integration-configurator/mcp-integration-configurator.component';
import { ThinkingProcessComponent } from '../../components/thinking-process/thinking-process.component';
import { WorkflowProgressComponent } from '../../components/workflow-progress/workflow-progress.component';
import { MCPServerDetails, MCPSettings } from 'src/app/types/mcp.types';
import {
  WorkflowErrorEvent,
  WorkflowType,
} from '../../model/interfaces/workflow-progress.interface';
import { WorkflowProgressService } from '../../services/workflow-progress/workflow-progress.service';
import { ProjectFailureMessageComponent } from '../../components/project-failure-message/project-failure-message.component';
import { ProjectCreationService } from '../../services/project-creation/project-creation.service';

@Component({
  selector: 'app-info',
  templateUrl: './app-info.component.html',
  styleUrls: ['./app-info.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    AsyncPipe,
    BadgeComponent,
    ButtonComponent,
    AccordionComponent,
    InputFieldComponent,
    ReactiveFormsModule,
    NgIconComponent,
    DocumentListingComponent,
    NgForOf,
    McpServersListComponent,
    McpIntegrationConfiguratorComponent,
    ThinkingProcessComponent,
    WorkflowProgressComponent,
    ProjectFailureMessageComponent,
  ],
  providers: [
    provideIcons({
      heroArchiveBox,
      heroLink,
      heroBriefcase,
      heroSquares2x2,
      heroCube,
      heroWindow,
      heroSquare3Stack3d,
      heroChevronDown,
      heroChevronUp,
      heroServerStack,
    }),
  ],
})
export class AppInfoComponent implements OnInit, OnDestroy {
  protected readonly APP_MESSAGES = APP_MESSAGES;
  protected readonly WorkflowType = WorkflowType;
  @ViewChild(MultiUploadComponent) multiUploadComponent!: MultiUploadComponent;
  @ViewChild('mermaidContainer') mermaidContainer!: ElementRef;
  fileContent: string = '';
  tasks: any[] = [];
  haiFolder = Object.keys(FileTypeEnum).map((key) => ({
    key,
    value: FileTypeEnum[key as keyof typeof FileTypeEnum],
  }));
  haiIcons = Object.keys(IconPairingEnum).map((key) => ({
    key,
    value: IconPairingEnum[key as keyof typeof IconPairingEnum],
  }));

  useGenAI: any = true;
  llmConfig$: Observable<LLMConfigModel> = this.store.select(
    LLMConfigState.getConfig,
  );
  currentLLMConfig!: LLMConfigModel;
  public loading: boolean = false;
  appName: string = '';
  jiraForm!: FormGroup;
  bedrockForm!: FormGroup;
  useBedrockConfig: boolean = false;
  editButtonDisabled: boolean = false;
  bedrockEditButtonDisabled: boolean = false;
  directories$ = this.store.select(ProjectsState.getProjectsFolders);
  selectedFolder: any = { title: 'solution', id: '' };
  content = new FormControl<string>('');
  appInfo: any = {};
  projectId = this.route.snapshot.paramMap.get('id');
  destroy$: Subject<boolean> = new Subject<boolean>();
  navigationState: any;
  isJiraConnected: boolean = false;
  isBedrockConnected: boolean = false;
  currentSettings?: ChatSettings;
  mcpServers: MCPServerDetails[] = [];
  mcpServersLoading: boolean = false;
  isEditingMcpSettings: boolean = false;
  mcpForm!: FormGroup;

  accordionState: { [key: string]: boolean } = {
    jira: false,
    knowledgeBase: false,
    mcp: false,
  };

  chatSettings$: Observable<ChatSettings> = this.store.select(
    ChatSettingsState.getConfig,
  );

  // Predefined order of folders
  folderOrder = ['BRD', 'NFR', 'PRD', 'UIR', 'BP'];
  isBedrockConfigPresent: boolean = false;
  isSavingMcpSettings: boolean = false;
  isCreatingSolution: boolean = false;
  solutionCreationComplete: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private toast: ToasterService,
    private electronService: ElectronService,
    private featureService: FeatureService,
    private logger: NGXLogger,
    private workflowProgressService: WorkflowProgressService,
    private projectCreationService: ProjectCreationService,
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.appInfo = navigation?.extras?.state?.['data'];
    this.navigationState = navigation?.extras?.state;
    this.appName = this.appInfo?.name;
  }

  @HostListener('window:focus')
  onFocus() {
    this.store.dispatch(new GetProjectFiles(this.projectId as string));
  }

  ngOnInit(): void {
    this.llmConfig$.subscribe((config) => {
      this.currentLLMConfig = config;
      this.isBedrockConfigPresent =
        this.currentLLMConfig?.providerConfigs['bedrock'] !== undefined;
    });

    if (this.projectId) {
      this.workflowProgressService
        .getCreationStatusObservable(this.projectId, WorkflowType.Solution)
        .pipe(
          takeUntil(this.destroy$),
          distinctUntilChanged(
            (prev, curr) =>
              prev.isCreating === curr.isCreating &&
              prev.isComplete === curr.isComplete &&
              prev.isFailed === curr.isFailed,
          ),
        )
        .subscribe((status) => {
          const wasCreating = this.isCreatingSolution;
          this.isCreatingSolution = status.isCreating;
          this.solutionCreationComplete = status.isComplete;

          if (wasCreating && !status.isCreating && status.isComplete) {
            this.store.dispatch(new GetProjectFiles(this.projectId as string));
            this.resetSolutionProgress();
          }

          if (status.isFailed) {
            this.appInfo.isFailed = true;
            this.appInfo.failureInfo = status.failureInfo;
          }
        });
    }
    this.store
      .select(ProjectsState.getProjects)
      .pipe(first())
      .subscribe((projects) => {
        const project = projects.find((p) => p.metadata.id === this.projectId);

        if (project) {
          this.appInfo = project.metadata;
          this.appName = project.project;

          this.store.dispatch(new GetProjectFiles(this.projectId as string));

          this.store.dispatch(
            new AddBreadcrumbs([
              {
                label: this.appName.replace(/(^\w{1})|(\s+\w{1})/g, (letter) =>
                  letter.toUpperCase(),
                ),
                url: `/apps/${this.appInfo.id}`,
              },
            ]),
          );
        } else {
          console.error('Project not found with id:', this.projectId);
        }
      });

    this.directories$
      .pipe(
        first((directories) => directories && directories.length > 0),
        takeUntil(this.destroy$),
      )
      .subscribe((directories) => {
        if (this.navigationState && this.navigationState['selectedFolder']) {
          this.selectedFolder = this.navigationState['selectedFolder'];
        }
        // Sort directories based on predefined order
        directories.sort((a, b) => {
          return (
            this.folderOrder.indexOf(a.name) - this.folderOrder.indexOf(b.name)
          );
        });
      });

    // Initialize Mermaid configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      flowchart: {
        useMaxWidth: true,
      },
    });

    // Initialize forms
    this.bedrockForm = new FormGroup({
      kbId: new FormControl(
        this.appInfo.integration?.bedrock?.kbId || '',
        Validators.required,
      ),
      accessKey: new FormControl(
        this.appInfo.integration?.bedrock?.accessKey || '',
        Validators.required,
      ),
      secretKey: new FormControl(
        this.appInfo.integration?.bedrock?.secretKey || '',
        Validators.required,
      ),
      region: new FormControl(
        this.appInfo.integration?.bedrock?.region || '',
        Validators.required,
      ),
      sessionKey: new FormControl(
        this.appInfo.integration?.bedrock?.sessionKey || '',
      ),
    });

    this.jiraForm = new FormGroup({
      jiraProjectKey: new FormControl(
        this.appInfo.integration?.jira?.jiraProjectKey || '',
        Validators.required,
      ),
      clientId: new FormControl(
        this.appInfo.integration?.jira?.clientId || '',
        Validators.required,
      ),
      clientSecret: new FormControl(
        this.appInfo.integration?.jira?.clientSecret || '',
        Validators.required,
      ),
      redirectUrl: new FormControl(
        this.appInfo.integration?.jira?.redirectUrl || '',
        Validators.required,
      ),
    });

    this.editButtonDisabled = !this.jiraForm.valid;
    this.jiraForm.statusChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.editButtonDisabled = !this.jiraForm.valid;
    });

    this.chatSettings$.subscribe((settings) => {
      this.currentSettings = settings;
    });

    this.bedrockEditButtonDisabled = !this.bedrockForm.valid;
    this.bedrockForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.bedrockEditButtonDisabled = !this.bedrockForm.valid;
      });

    this.isJiraConnected = (() => {
      const tokenInfo = getJiraTokenInfo(this.projectId as string);
      return (
        tokenInfo.projectKey ===
          this.appInfo.integration?.jira?.jiraProjectKey &&
        !!tokenInfo.token &&
        this.isTokenValid()
      );
    })();

    this.handleIntegrationNavState();
    this.isBedrockConnected = !!this.appInfo.integration?.bedrock?.kbId;
    this.isJiraConnected && this.jiraForm.disable();
    this.isBedrockConnected && this.bedrockForm.disable();

    this.initMcpForm();
  }

  isTokenValid(): boolean {
    const { token, tokenExpiration } = getJiraTokenInfo(
      this.projectId as string,
    );
    return (
      !!token && !!tokenExpiration && new Date() < new Date(tokenExpiration)
    );
  }

  handleJiraAuthentication(): void {
    const { jiraProjectKey, clientId, clientSecret, redirectUrl } =
      this.jiraForm.getRawValue();

    const oauthParams = {
      clientId: clientId,
      clientSecret: clientSecret,
      redirectUri: redirectUrl,
    };
    this.electronService
      .startJiraOAuth(oauthParams)
      .then((authResponse) => {
        storeJiraToken(authResponse, jiraProjectKey, this.projectId as string);
        console.debug('Token received and stored.', authResponse.accessToken);
        this.saveJiraData();
        this.toast.showSuccess(APP_INTEGRATIONS.JIRA.SUCCESS);
      })
      .catch((error) => {
        console.error('Error during OAuth process:', error);
        this.toast.showError(APP_INTEGRATIONS.JIRA.ERROR);
      });
  }

  saveJiraData() {
    const { jiraProjectKey, clientId, clientSecret, redirectUrl } =
      this.jiraForm.getRawValue();
    const tokenInfo = getJiraTokenInfo(this.projectId as string);

    const updatedMetadata = {
      ...this.appInfo,
      integration: {
        ...this.appInfo.integration,
        jira: { jiraProjectKey, clientId, clientSecret, redirectUrl },
      },
    };

    this.store
      .dispatch(new UpdateMetadata(this.appInfo.id, updatedMetadata))
      .subscribe(() => {
        this.logger.debug('Jira metadata updated successfully');
        this.jiraForm.disable();
        this.isJiraConnected =
          tokenInfo.projectKey === jiraProjectKey && !!tokenInfo.token;
        this.editButtonDisabled = true;
      });
  }

  disconnectJira(): void {
    resetJiraToken(this.projectId as string);
    this.jiraForm.enable();
    this.isJiraConnected = false;
    this.editButtonDisabled = false;
    this.toast.showSuccess(APP_INTEGRATIONS.JIRA.DISCONNECT);
  }

  saveBedrockData() {
    const { kbId, accessKey, secretKey, region, sessionKey } =
      this.bedrockForm.getRawValue();
    const config = { kbId, accessKey, secretKey, region, sessionKey };

    this.featureService
      .validateBedrockId(config)
      .then((isValid) => {
        if (isValid) {
          const bedrockConfig = {
            kbId,
            accessKey,
            secretKey,
            region,
            ...(sessionKey && { sessionKey }),
          };

          const updatedMetadata = {
            ...this.appInfo,
            integration: {
              ...this.appInfo.integration,
              bedrock: bedrockConfig,
            },
          };

          this.store.dispatch(
            new SetChatSettings({
              ...this.currentSettings,
              ...bedrockConfig,
            }),
          );

          this.store
            .dispatch(new UpdateMetadata(this.appInfo.id, updatedMetadata))
            .subscribe(() => {
              this.logger.debug('Bedrock metadata updated successfully');
              this.bedrockForm.disable();
              this.bedrockEditButtonDisabled = true;
              this.isBedrockConnected = true;
              this.toast.showSuccess(APP_INTEGRATIONS.BEDROCK.SUCCESS);
            });
        } else {
          this.toast.showError(APP_INTEGRATIONS.BEDROCK.INVALID);
        }
      })
      .catch((error: Error) => {
        console.error('Error during Bedrock validation:', error);
        this.toast.showError(APP_INTEGRATIONS.BEDROCK.ERROR);
      });
  }

  disconnectBedrock(): void {
    const updatedMetadata = {
      ...this.appInfo,
      integration: { ...this.appInfo.integration, bedrock: '' },
    };

    this.store.dispatch(
      new SetChatSettings({
        ...this.currentSettings,
        kb: '',
        accessKey: '',
        sessionKey: '',
        secretKey: '',
        region: '',
      }),
    );

    this.store
      .dispatch(new UpdateMetadata(this.appInfo.id, updatedMetadata))
      .subscribe(() => {
        this.bedrockForm.enable();
        this.bedrockEditButtonDisabled = false;
        this.isBedrockConnected = false;
        this.toast.showSuccess(APP_INTEGRATIONS.BEDROCK.DISCONNECT);
      });
  }

  selectFolder(folder: any): void {
    this.selectedFolder = {
      title: folder.name,
      id: this.projectId as string,
      metadata: this.appInfo,
    };

    // Reset MCP servers list if navigating away from integrations
    if (folder.name !== 'app-integrations') {
      this.mcpServers = [];
      this.accordionState['mcp'] = false;
    }
  }

  async toggleAccordion(key: string) {
    this.accordionState[key] = !this.accordionState[key];

    // Load MCP servers when the accordion is opened
    if (key === 'mcp' && this.accordionState[key]) {
      await this.loadMcpServers();
    }
  }

  initMcpForm(): void {
    this.mcpForm = new FormGroup({
      mcpSettings: new FormControl(this.appInfo.integration?.mcp || {}),
    });
  }

  async loadMcpServers(): Promise<void> {
    if (!this.projectId) {
      this.logger.warn('Project ID not available to load MCP servers.');
      return;
    }

    this.mcpServersLoading = true;
    try {
      // Pass the projectId in the filter
      this.mcpServers = await this.electronService.listMCPServers({
        _hai_mcp_source_id: this.projectId,
        _hai_mcp_source_type: 'project',
      });
      this.logger.debug(
        'MCP Servers loaded for project:',
        this.projectId,
        this.mcpServers,
      );
    } catch (error) {
      this.logger.error('Error loading MCP servers:', error);
      this.toast.showError('Failed to load MCP servers.');
      this.mcpServers = []; // Reset on error
    } finally {
      this.mcpServersLoading = false;
    }
  }

  getDescription(input: string | undefined): string | null {
    return getDescriptionFromInput(input);
  }

  directoryContainsFolder(
    folderName: string,
    directories: { name: string; children: string[] }[],
  ) {
    return directories.some(
      (dir) => dir.name.includes(folderName) && !this.isArchived(dir),
    );
  }

  isArchived(directories: { name: string; children: string[] }) {
    if (directories.name === RequirementTypeEnum.PRD)
      return directories.children
        .filter((child) => child.includes(FILTER_STRINGS.BASE))
        .every((child) => child.includes(FILTER_STRINGS.ARCHIVED));
    return directories.children.every((child) =>
      child.includes(FILTER_STRINGS.ARCHIVED),
    );
  }

  navigateToBPAdd(): void {
    // Check if any non-archived PRD or BRD exists
    this.directories$.pipe(first()).subscribe((directories) => {
      const prdDir = directories.find((dir) => dir.name === 'PRD');
      const brdDir = directories.find((dir) => dir.name === 'BRD');

      // For PRD, only check base files that aren't archived
      const hasPRD =
        prdDir &&
        prdDir.children
          .filter((child) => child.includes('-base.json'))
          .some((child) => !child.includes('-archived'));

      // For BRD, only check base files that aren't archived
      const hasBRD =
        brdDir &&
        brdDir.children
          .filter((child) => child.includes('-base.json'))
          .some((child) => !child.includes('-archived'));

      if (!hasPRD && !hasBRD) {
        this.toast.showWarning(
          APP_INFO_COMPONENT_ERROR_MESSAGES.REQUIRES_PRD_OR_BRD,
        );
        return;
      }

      this.router
        .navigate(['/bp-add'], {
          state: {
            data: this.appInfo,
            id: this.projectId,
            folderName: 'BP',
            breadcrumb: {
              name: 'Add Document',
              link: this.router.url,
              icon: 'add',
            },
          },
        })
        .then();
    });
  }

  navigateToAdd(folderName: string) {
    this.router
      .navigate(['/add'], {
        state: {
          data: this.appInfo,
          id: this.projectId,
          folderName: folderName,
          breadcrumb: {
            name: 'Add Document',
            link: this.router.url,
            icon: 'add',
          },
        },
      })
      .then();
  }

  navigateToBPFlow(item: any) {
    this.router.navigate(['/bp-flow/view', item.id], {
      state: {
        data: this.appInfo,
        id: item.id,
        folderName: item.folderName,
        fileName: item.fileName,
        req: item.content,
        selectedFolder: {
          title: item.folderName,
          id: this.appInfo.id,
          metadata: this.appInfo,
        },
      },
    });
  }

  handleIntegrationNavState(): void {
    if (this.navigationState && this.navigationState['openAppIntegrations']) {
      this.selectFolder({ name: 'app-integrations', children: [] });
      this.toggleAccordion('jira');
    }
  }

  getIconName(key: string): string {
    const icon = IconPairingEnum[key as keyof typeof IconPairingEnum];
    return icon || 'defaultIcon';
  }

  toggleBedrockConfig(event: Event): void {
    this.useBedrockConfig = (event.target as HTMLInputElement).checked;
    if (
      this.useBedrockConfig &&
      this.currentLLMConfig?.providerConfigs['bedrock']
    ) {
      const bedrockConfig =
        this.currentLLMConfig.providerConfigs['bedrock'].config;
      this.bedrockForm.patchValue(
        {
          accessKey: bedrockConfig.accessKeyId || '',
          secretKey: bedrockConfig.secretAccessKey || '',
          region: bedrockConfig.region || '',
          sessionKey: bedrockConfig.sessionToken || '',
        },
        { emitEvent: false },
      );
    } else {
      this.bedrockForm.patchValue(
        {
          accessKey: this.appInfo.integration?.bedrock?.accessKey || '',
          secretKey: this.appInfo.integration?.bedrock?.secretKey || '',
          region: this.appInfo.integration?.bedrock?.region || '',
          sessionKey: this.appInfo.integration?.bedrock?.sessionKey || '',
        },
        { emitEvent: false },
      );
    }
  }

  toggleMcpSettingsEdit(): void {
    this.isEditingMcpSettings = !this.isEditingMcpSettings;
    if (this.isEditingMcpSettings) {
      this.loadMcpSettings();
    } else {
      this.mcpForm.reset(this.appInfo.integration?.mcp || {});
    }
  }

  saveMcpSettings(): void {
    if (this.mcpForm.valid && !this.isSavingMcpSettings) {
      this.isSavingMcpSettings = true;
      const mcpSettings: MCPSettings = this.mcpForm.get('mcpSettings')?.value;

      this.toast.showInfo('Updating project mcp settings');

      this.electronService
        .updateProjectMCPSettings(this.projectId as string, mcpSettings)
        .then((result: { success: boolean; error?: string }) => {
          if (result.success) {
            this.logger.debug('MCP settings updated successfully');
            this.toast.showSuccess('MCP settings saved successfully');
            this.isEditingMcpSettings = false;
            this.loadMcpServers();
          } else {
            throw new Error(result.error || 'Unknown error occurred');
          }
        })
        .catch((error: Error) => {
          this.logger.error('Error updating MCP settings:', error);
          this.toast.showError('Failed to save MCP settings');
        })
        .finally(() => {
          this.isSavingMcpSettings = false;
        });
    }
  }

  loadMcpSettings(): void {
    this.electronService
      .getProjectMCPSettings(this.projectId as string)
      .then(
        (result: {
          success: boolean;
          settings?: MCPSettings;
          error?: string;
        }) => {
          if (result.success && result.settings) {
            this.mcpForm.patchValue({ mcpSettings: result.settings });
          } else {
            throw new Error(result.error || 'Unknown error occurred');
          }
        },
      )
      .catch((error: Error) => {
        this.logger.error('Error loading MCP settings:', error);
        this.toast.showError('Failed to load MCP settings');
      });
  }

  resetSolutionProgress(): void {
    if (this.projectId) {
      this.workflowProgressService.removeGlobalListener(
        this.projectId,
        WorkflowType.Solution,
        this.electronService,
      );
    }
  }

  get isProjectFailed(): boolean {
    return this.appInfo?.isFailed === true;
  }

  get projectFailureInfo(): WorkflowErrorEvent | null {
    return this.appInfo?.failureInfo || null;
  }

  async retryProjectCreation(): Promise<void> {
    try {
      if (this.projectId) {
        this.workflowProgressService.clearProgressEvents(
          this.projectId,
          WorkflowType.Solution,
        );
      }
      await this.projectCreationService.createProject({
        projectData: this.appInfo,
        projectName: this.appName,
        isRetry: true,
        onSuccess: () => {
          this.appInfo.isFailed = false;
          this.appInfo.failureInfo = null;
          this.store.dispatch(new GetProjectFiles(this.projectId as string));
        },
        onError: (error) => {
          this.logger.error('Project retry failed:', error);
        },
      });
    } catch (error: any) {
      this.toast.showError(
        `Failed to retry project creation: ${error.message}`,
      );
      this.logger.error('Project retry failed:', error);
    }
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
