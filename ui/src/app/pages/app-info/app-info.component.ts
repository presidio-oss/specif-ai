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
import { Observable, Subject, first, takeUntil } from 'rxjs';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { MultiUploadComponent } from '../../components/multi-upload/multi-upload.component';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { NgIconComponent } from '@ng-icons/core';
import { DocumentListingComponent } from '../../components/document-listing/document-listing.component';
import { APP_MESSAGES, FILTER_STRINGS } from '../../constants/app.constants';
import { APP_INFO_COMPONENT_ERROR_MESSAGES } from '../../constants/messages.constants';
import { AccordionComponent } from '../../components/accordion/accordion.component';
import { ToasterService } from '../../services/toaster/toaster.service';
import { NGXLogger } from 'ngx-logger';
import { FileTypeEnum, IconPairingEnum } from '../../model/enum/file-type.enum';
import { ComponentLoaderComponent } from '../../components/core/component-loader/component-loader.component';
import { SetChatSettings } from 'src/app/store/chat-settings/chat-settings.action';
import { ChatSettings } from 'src/app/model/interfaces/ChatSettings';
import { ChatSettingsState } from 'src/app/store/chat-settings/chat-settings.state';
import { DocumentTypeMappingEnum, RequirementTypeEnum } from 'src/app/model/enum/requirement-type.enum';
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
import {
  DocumentMetadata,
  Document,
  SolutionMetadata,
} from 'src/app/model/interfaces/projects.interface';

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
    ComponentLoaderComponent
  ],
})
export class AppInfoComponent implements OnInit, OnDestroy {
  protected readonly APP_MESSAGES = APP_MESSAGES;
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
  public sidebarLoading: boolean = false;
  appName: string = '';
  jiraForm!: FormGroup;
  bedrockForm!: FormGroup;
  useBedrockConfig: boolean = false;
  editButtonDisabled: boolean = false;
  bedrockEditButtonDisabled: boolean = false;
  directories$ = this.store.select(ProjectsState.getProjectsFolders);
  documentMetadata: DocumentMetadata[] = [];
  documents: Document[] = [];
  integration: any = {};
  solutionMetadata: SolutionMetadata[] = [];
  selectedTab: any = { title: 'solution', id: '' };
  content = new FormControl<string>('');
  appInfo: any = {};
  // FIXME: Remove projectId and check wherever affected
  projectId = this.route.snapshot.paramMap.get('id');
  destroy$: Subject<boolean> = new Subject<boolean>();
  navigationState: any;
  isJiraConnected: boolean = false;
  isBedrockConnected: boolean = false;
  currentSettings?: ChatSettings;

  accordionState: { [key: string]: boolean } = {
    jira: false,
    knowledgeBase: false,
  };

  chatSettings$: Observable<ChatSettings> = this.store.select(
    ChatSettingsState.getConfig,
  );
  // Predefined order of folders (lowercase to match documentTypeId)
  folderOrder = ['brd', 'prd', 'nfr', 'uir', 'bp'];
  isBedrockConfigPresent: boolean = false;
  solutionId = Number(this.route.snapshot.paramMap.get('id'));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private toast: ToasterService,
    private electronService: ElectronService,
    private featureService: FeatureService,
    private logger: NGXLogger,
  ) {
    const navigation = this.router.getCurrentNavigation();
    // TODO: Remove appInfo variable after completing integrations
    this.appInfo = navigation?.extras?.state?.['data'];
    this.navigationState = navigation?.extras?.state;
  }

  @HostListener('window:focus')
  onFocus() {
    this.store.dispatch(new GetProjectFiles(this.projectId as string));
  }

  getIconPairing(type: string): string {
    switch (type) {
      case DocumentTypeMappingEnum.BRD:
        return IconPairingEnum.BRD;
      case DocumentTypeMappingEnum.PRD:
        return IconPairingEnum.PRD;
      case DocumentTypeMappingEnum.UIR:
        return IconPairingEnum.UIR;
      case DocumentTypeMappingEnum.NFR:
        return IconPairingEnum.NFR;
      case DocumentTypeMappingEnum.BP:
        return IconPairingEnum.BP;
      default:
        return "";
    }
  }

  async ngOnInit() {
    this.llmConfig$.subscribe((config) => {
      this.currentLLMConfig = config;
      this.isBedrockConfigPresent =
        this.currentLLMConfig?.providerConfigs['bedrock'] !== undefined;
    });

    // TODO: Get integrations as well
    // TODO: Fix breadcrumbs
    this.solutionId = Number(this.route.snapshot.paramMap.get('id'));
    console.log("Current solution id", this.solutionId)
    await this.getSolutionDetails(this.solutionId);

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
        this.integration?.bedrock?.kbId || '',
        Validators.required,
      ),
      accessKey: new FormControl(
        this.integration?.bedrock?.accessKey || '',
        Validators.required,
      ),
      secretKey: new FormControl(
        this.integration?.bedrock?.secretKey || '',
        Validators.required,
      ),
      region: new FormControl(
        this.integration?.bedrock?.region || '',
        Validators.required,
      ),
      sessionKey: new FormControl(
        this.integration?.bedrock?.sessionKey || '',
      ),
    });

    this.jiraForm = new FormGroup({
      jiraProjectKey: new FormControl(
        this.integration?.jira?.jiraProjectKey || '',
        Validators.required,
      ),
      clientId: new FormControl(
        this.integration?.jira?.clientId || '',
        Validators.required,
      ),
      clientSecret: new FormControl(
        this.integration?.jira?.clientSecret || '',
        Validators.required,
      ),
      redirectUrl: new FormControl(
        this.integration?.jira?.redirectUrl || '',
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
          this.integration?.jira?.jiraProjectKey &&
        !!tokenInfo.token &&
        this.isTokenValid()
      );
    })();

    this.handleIntegrationNavState();
    this.isBedrockConnected = !!this.integration?.bedrock?.kbId;
    this.isJiraConnected && this.jiraForm.disable();
    this.isBedrockConnected && this.bedrockForm.disable();
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
        ...this.integration,
        jira: { jiraProjectKey, clientId, clientSecret, redirectUrl },
      },
    };

    this.store
      .dispatch(new UpdateMetadata(this.appInfo.id, updatedMetadata))
      .subscribe({
        next: () => {
          this.logger.debug('Jira metadata updated successfully');
          this.jiraForm.disable();
          this.isJiraConnected =
            tokenInfo.projectKey === jiraProjectKey && !!tokenInfo.token;
          this.editButtonDisabled = true;
        },
        error: (error) => {
          console.error('Error updating Jira metadata:', error);
        }
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
              ...this.integration,
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
            .subscribe({
              next: () => {
                this.logger.debug('Bedrock metadata updated successfully');
                this.bedrockForm.disable();
                this.bedrockEditButtonDisabled = true;
                this.isBedrockConnected = true;
                this.toast.showSuccess(APP_INTEGRATIONS.BEDROCK.SUCCESS);
              },
              error: (error) => {
                console.error('Error updating Bedrock metadata:', error);
                this.toast.showError(APP_INTEGRATIONS.BEDROCK.ERROR);
              }
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
      integration: { ...this.integration, bedrock: '' },
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
      .subscribe({
        next: () => {
          this.bedrockForm.enable();
          this.bedrockEditButtonDisabled = false;
          this.isBedrockConnected = false;
          this.toast.showSuccess(APP_INTEGRATIONS.BEDROCK.DISCONNECT);
        },
        error: (error) => {
          console.error('Error disconnecting Bedrock:', error);
          this.toast.showError(APP_INTEGRATIONS.BEDROCK.ERROR);
        }
      });
  }

  async getSolutionDetails(solutionId: number) {
    // For sidebar to show loader
    this.sidebarLoading = true;
    
    try {
      const [
        documentCount,
        getAllDocuments,
        businessProcesses,
        solutionMetadata,
        integrations
      ] = await Promise.all([
        this.electronService.getDocumentByCount({ solutionId }),
        this.electronService.getAllDocuments({ solutionId }),
        this.electronService.getAllBusinessProcesses({ solutionId }),
        this.electronService.getSolutionMetadata({ solutionId }),
        this.electronService.getSolutionIntegrations({ solutionId })
      ]);
  
      const allowedTypes = Object.values(DocumentTypeMappingEnum);
      this.documentMetadata = documentCount
        .filter((metadata: DocumentMetadata) =>
          allowedTypes.includes(metadata.documentTypeId as DocumentTypeMappingEnum)
        )
        .sort((a: DocumentMetadata, b: DocumentMetadata) =>
          this.folderOrder.indexOf(a.documentTypeId) - this.folderOrder.indexOf(b.documentTypeId)
        );
  
      this.documents = [...getAllDocuments, ...businessProcesses];
      this.solutionMetadata = solutionMetadata;
      this.integration = integrations && integrations[0] ? integrations[0] : {};
  
      if (solutionMetadata && solutionMetadata.length > 0) {
        this.appName = solutionMetadata[0].name;
        this.store.dispatch(new AddBreadcrumbs([{ label: this.appName, url: `/apps/${this.solutionId}` }]));
      }
    } catch (error) {
      console.error('Error loading solution details:', error);
      this.toast.showError('Error loading solution details');
    } finally {
      this.sidebarLoading = false;
    }
  }
  
  selectTab(title: string): void {
    this.selectedTab = {
      title: title,
      id: this.projectId as string,
      metadata: this.solutionMetadata,
    };
  }

  toggleAccordion(key: string) {
    this.accordionState[key] = !this.accordionState[key];
  }

  getDescription(input: string | undefined): string | null {
    return getDescriptionFromInput(input);
  }

  directoryContainsFolder(
    folderName: string,
    directories: { name: string; children: string[] }[],
  ) {
    return directories.some((dir) => dir.name.includes(folderName) && !this.isArchived(dir));
  }

  isArchived(directories: { name: string; children: string[]}) {
    if(directories.name === RequirementTypeEnum.PRD)  return directories.children.filter((child) => child.includes(FILTER_STRINGS.BASE)).every((child) => child.includes(FILTER_STRINGS.ARCHIVED));
    return directories.children.every((child) => child.includes(FILTER_STRINGS.ARCHIVED));
  }

  navigateToBPAdd(): void {
    const hasPRD = this.documents.some(
      (doc) => doc.documentTypeId === DocumentTypeMappingEnum.PRD,
    );

    const hasBRD = this.documents.some(
      (doc) => doc.documentTypeId === DocumentTypeMappingEnum.BRD,
    );

    if (!hasPRD && !hasBRD) {
      this.toast.showWarning(
        APP_INFO_COMPONENT_ERROR_MESSAGES.REQUIRES_PRD_OR_BRD,
      );
      return;
    }

    this.router
      .navigate(['/bp-add'], {
        state: {
          solutionId: this.solutionId,
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
    // FIXME: add integration navigation independent of navigation state
    // if (this.navigationState && this.navigationState['openAppIntegrations']) {
    //   this.selectTab({ name: 'app-integrations', children: [] });
    //   this.toggleAccordion('jira');
    // }
  }

  getIconName(key: string): string {
    const icon = IconPairingEnum[key as keyof typeof IconPairingEnum];
    return icon || 'defaultIcon';
  }

  toggleBedrockConfig(event: Event): void {
    this.useBedrockConfig = (event.target as HTMLInputElement).checked;
    if (this.useBedrockConfig && this.currentLLMConfig?.providerConfigs['bedrock']) {
      const bedrockConfig = this.currentLLMConfig.providerConfigs['bedrock'].config;
      this.bedrockForm.patchValue({
        accessKey: bedrockConfig.accessKeyId || '',
        secretKey: bedrockConfig.secretAccessKey || '',
        region: bedrockConfig.region || '',
        sessionKey: bedrockConfig.sessionToken || ''
      }, { emitEvent: false });
    } else {
      this.bedrockForm.patchValue({
        accessKey: this.integration?.bedrock?.accessKey || '',
        secretKey: this.integration?.bedrock?.secretKey || '',
        region: this.integration?.bedrock?.region || '',
        sessionKey: this.integration?.bedrock?.sessionKey || ''
      }, { emitEvent: false });
    }
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
