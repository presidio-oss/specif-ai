import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  NgZone,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { WorkflowProgressDialogComponent } from '../../../components/workflow-progress/workflow-progress-dialog/workflow-progress-dialog.component';
import { Router, ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../../store/projects/projects.state';
import { ArchiveFile, ReadFile } from '../../../store/projects/projects.actions';
import { UserStoriesState } from '../../../store/user-stories/user-stories.state';
import { SetSelectedUserStory } from '../../../store/user-stories/user-stories.actions';
import { RequirementIdService } from '../../../services/requirement-id.service';
import { IUserStory } from '../../../model/interfaces/IUserStory';
import { AppSystemService } from '../../../services/app-system/app-system.service';
import { ToasterService } from '../../../services/toaster/toaster.service';
import { ElectronService } from '../../../electron-bridge/electron.service';
import { joinPaths } from '../../../utils/path.utils';
import { ButtonComponent } from '../../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { UnifiedCardComponent, CardStatusIndicator, CardBadge } from '../../../components/unified-card/unified-card.component';
import { BadgeComponent } from '../../../components/core/badge/badge.component';
import {
  FILTER_STRINGS,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../../constants/app.constants';
import { SearchInputComponent } from '../../../components/core/search-input/search-input.component';
import { BehaviorSubject, combineLatest, firstValueFrom, map, take } from 'rxjs';
import { AppSelectComponent, SelectOption } from '../../../components/core/app-select/app-select.component';
import { TestCaseContextModalComponent } from 'src/app/components/test-case-context-modal/test-case-context-modal.component';
import { ExportDropdownComponent } from 'src/app/export-dropdown/export-dropdown.component';
import {
  WorkflowType,
  WorkflowProgressEvent,
} from '../../../model/interfaces/workflow-progress.interface';
import { environment } from '../../../../environments/environment';
import { TestCaseService } from '../../../services/test-case/test-case.service';
import {
  ITestCase,
  ITestCaseRequest,
  ThinkingProcessConfig,
} from '../../../model/interfaces/test-case/testcase.interface';
import { SearchService } from '../../../services/search/search.service';
import { DialogService } from '../../../services/dialog/dialog.service';
import { ClipboardService } from '../../../services/clipboard.service';
import { LoadingService } from '../../../services/loading.service';
import {
  AddBreadcrumb,
  DeleteBreadcrumb,
} from '../../../store/breadcrumb/breadcrumb.actions';
import { WorkflowProgressService } from 'src/app/services/workflow-progress/workflow-progress.service';
import { heroArrowRight } from '@ng-icons/heroicons/outline';
import { provideIcons } from '@ng-icons/core';
import { RequirementTypeEnum } from 'src/app/model/enum/requirement-type.enum';

@Component({
  selector: 'app-test-case-list',
  templateUrl: './test-case-list.component.html',
  standalone: true,
  imports: [
    ButtonComponent,
    MatMenuModule,
    AsyncPipe,
    NgIf,
    NgForOf,
    BadgeComponent,
    SearchInputComponent,
    ExportDropdownComponent,
    MatTooltipModule,
    WorkflowProgressDialogComponent,
    UnifiedCardComponent,
    AppSelectComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
    providers: [
      provideIcons({
        heroArrowRight,
      }),
    ],
})
export class TestCaseListComponent implements OnInit, OnDestroy {
  currentProject!: string;
  newFileName: string = '';
  entityType: string = 'TC';
  selectedUserStory: any = {};
  metadata: any = {};
  private searchTerm$ = new BehaviorSubject<string>('');
  priorityFilter$ = new BehaviorSubject<string | null>(null);
  typeFilter$ = new BehaviorSubject<string | null>(null);
  stepsCountFilter$ = new BehaviorSubject<string | null>(null);
  
  priorityOptions = this.testCaseService.priorityFilterOptions;
  typeOptions = this.testCaseService.typeFilterOptions;
  stepsCountOptions = this.testCaseService.stepsCountFilterOptions;
  router = inject(Router);
  route = inject(ActivatedRoute);
  logger = inject(NGXLogger);
  store = inject(Store);
  searchService = inject(SearchService);
  requirementFile: any = [];
  testCases: ITestCase[] = [];

  testCaseUserStoryMap: Map<string, string> = new Map();

  currentProjectFiles: { name: string; children: string[] }[] = [];

  navigation: {
    projectId: string;
    folderName: string;
    fileName: string;
    selectedRequirement: any;
    prdInfo: {
      prdId: string;
      prdTitle: string;
      prdDescription: string;
    };
    userStoryInfo: {
      id: string;
      name: string;
      description: string;
    };
    data: any;
  } = {
    projectId: '',
    folderName: '',
    fileName: '',
    selectedRequirement: {},
    prdInfo: {
      prdId: '',
      prdTitle: '',
      prdDescription: ''
    },
    userStoryInfo: {
      id: '',
      name: '',
      description: ''
    },
    data: {},
  };

  currentLabel: string = '';

  testCases$ = new BehaviorSubject<ITestCase[]>([]);

  filteredTestCases$ = combineLatest([
    this.testCases$,
    this.searchTerm$,
    this.priorityFilter$,
    this.typeFilter$,
    this.stepsCountFilter$
  ]).pipe(
    map(([testCases, searchTerm, priorityFilter, typeFilter, stepsCountFilter]) => {
      let filtered = searchTerm 
        ? testCases.filter(testCase => 
            testCase.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
            testCase.title.toLowerCase().includes(searchTerm.toLowerCase()))
        : testCases;
      
      if (priorityFilter && priorityFilter !== 'all') {
        filtered = filtered.filter(testCase => testCase.priority === priorityFilter);
      }
      
      if (typeFilter && typeFilter !== 'all') {
        filtered = filtered.filter(testCase => testCase.type === typeFilter);
      }
      
      if (stepsCountFilter && stepsCountFilter !== 'all') {
        filtered = filtered.filter(testCase => {
          const stepsCount = testCase.steps?.length || 0;
          switch (stepsCountFilter) {
            case '1-3': return stepsCount >= 1 && stepsCount <= 3;
            case '4-6': return stepsCount >= 4 && stepsCount <= 6;
            case '7+': return stepsCount >= 7;
            default: return true;
          }
        });
      }
      
      return filtered;
    })
  );

  selectedProject$ = this.store.select(ProjectsState.getSelectedProject);
  selectedFileContent$ = this.store.select(
    ProjectsState.getSelectedFileContent,
  );
  selectedUserStory$ = this.store.select(UserStoriesState.getSelectedUserStory);

  testCasesInState: ITestCase[] = [];
  WorkflowType = WorkflowType;

  testCaseCreationProgress: WorkflowProgressEvent[] = [];
  showThinkingProcess: boolean = false;
  showProgressDialog: boolean = false;
  testCaseGenerationComplete: boolean = false;
  thinkingProcessConfig: ThinkingProcessConfig = {
    title: 'Creating Test Cases',
    subtitle: `Sit back & let the Specifai do its job...`,
  };
  zone = inject(NgZone);
  
  get userStoryId(): string {
    return this.route.snapshot.paramMap.get('userStoryId') || 
           this.navigation.userStoryInfo?.id;
  }

  private workflowProgressListener = (
    event: any,
    data: WorkflowProgressEvent,
  ) => {
    this.zone.run(() => {
      this.logger.debug('Received workflow progress event:', data);
      
      this.testCaseCreationProgress = [...this.testCaseCreationProgress, data];
      
      if (!this.showThinkingProcess) {
        this.showThinkingProcess = true;
      }
      
      this.showThinkingProcess = true;
    });
  };

  readonly dialogService = inject(DialogService);

  onSearch(term: string) {
    this.searchTerm$.next(term);
  }
  
  /**
   * Updates the priority filter
   */
  onPriorityFilterChange(value: any) {
    this.priorityFilter$.next(value);
  }
  
  /**
   * Updates the type filter
   */
  onTypeFilterChange(value: any) {
    this.typeFilter$.next(value);
  }
  
  /**
   * Updates the steps count filter
   */
  onStepsCountFilterChange(value: any) {
    this.stepsCountFilter$.next(value);
  }

  constructor(
    private testCaseService: TestCaseService,
    private clipboardService: ClipboardService,
    private electronService: ElectronService,
    private toast: ToasterService,
    private appSystemService: AppSystemService,
    private requirementIdService: RequirementIdService,
    private workflowProgressService: WorkflowProgressService,
  ) {
    this.navigation = {
      projectId: '',
      folderName: '',
      fileName: '',
      selectedRequirement: {},
      prdInfo: {
        prdId: '',
        prdTitle: '',
        prdDescription: ''
      },
      userStoryInfo: {
        id: '',
        name: '',
        description: ''
      },
      data: {},
    };

    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');

    if (this.navigation.selectedRequirement?.id) {
      this.currentLabel = `${this.navigation.selectedRequirement.id} - Test Cases`;
    } else if (userStoryId) {
      this.currentLabel = `${userStoryId} - Test Cases`;
    } else {
      this.currentLabel = 'Test Cases';
    }

    this.store.dispatch(
      new AddBreadcrumb({
        label: 'Test Cases',
        tooltipLabel: 'Test Cases Home',
        url: '/test-cases-home'
      })
    );
    
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.currentLabel,
        tooltipLabel: `Test Cases for ${userStoryId}`,
      })
    );

    this.store.select(ProjectsState.getMetadata).subscribe((res) => {
      this.metadata = res;
    });
  }

  ngOnInit() {
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');
    
    this.route.queryParams.subscribe((params: { [key: string]: string }) => {
      if (params['projectName']) {
        this.navigation.projectId = params['projectName'];
        this.logger.debug(`Project name from query params: ${this.navigation.projectId}`);
      }
      
      if (params['prdId']) {
        this.navigation.prdInfo = {
          prdId: params['prdId'],
          prdTitle: params['prdTitle'] ? decodeURIComponent(params['prdTitle']) : '',
          prdDescription: params['prdDescription'] ? decodeURIComponent(params['prdDescription']) : ''
        };
      }
    });
    
    if (this.userStoryId) {
      this.setupTestCaseProgressListener();
      
    this.workflowProgressService
      .getCreationStatusObservable(
        this.userStoryId,
        WorkflowType.TestCase
      )
      .subscribe((status) => {
        this.logger.debug('Workflow status changed:', status);
        this.showThinkingProcess = status.isCreating || status.isComplete;
        this.showProgressDialog = status.isCreating || status.isComplete;
        this.testCaseGenerationComplete = status.isComplete;
      });
    }
    
    if (userStoryId) {
      this.store.dispatch(new SetSelectedUserStory(userStoryId));
    }

    this.store.select(ProjectsState.getMetadata).subscribe((res) => {
      this.metadata = res;
    });

    if (this.navigation.fileName) {
      this.store.dispatch(
        new ReadFile(
          `${this.navigation.folderName}/${this.navigation.fileName}`,
        ),
      );
    }

    this.selectedProject$.subscribe((project) => {
      this.currentProject = project;
      this.logger.debug(project, 'selected project');

      if (this.navigation.fileName) {
        this.newFileName = this.navigation.fileName.replace('base', 'feature');
      }

      if (project && userStoryId) {
        this.loadTestCasesForUserStory(userStoryId);
      }
    });

    this.selectedFileContent$.subscribe((res: any) => {
      this.requirementFile = res;
    });

    this.testCases$.subscribe((testCases: ITestCase[]) => {
      this.testCasesInState = testCases;
    });

    this.store.select(ProjectsState.getProjectsFolders).subscribe((folders) => {
      this.currentProjectFiles = folders;
    });
    
    this.selectedUserStory$.subscribe(userStory => {
      if (userStory && (!this.navigation.selectedRequirement || !this.navigation.selectedRequirement.name)) {
        this.logger.debug('Retrieved user story from store:', userStory);
        
        this.navigation.userStoryInfo = {
          id: userStory.id || '',
          name: userStory.name || '',
          description: userStory.description || ''
        };
        
        this.navigation.selectedRequirement = userStory;
        
        if (this.currentLabel && userStory.id) {
          this.store.dispatch(
            new AddBreadcrumb({
              label: this.currentLabel,
              tooltipLabel: `Test Cases for ${userStory.id}: ${userStory.name}`,
            })
          );
        }
      }
    });
  }

  loadTestCasesForUserStory(userStoryId: string) {
    this.logger.debug(`Loading test cases for user story ${userStoryId}`);

    const testCasePath = joinPaths(this.currentProject, REQUIREMENT_TYPE.TC, userStoryId);
    this.logger.debug(`Checking if directory exists: ${testCasePath}`);

    this.appSystemService
      .fileExists(testCasePath)
      .then((exists: boolean) => {
        this.logger.debug(`Directory exists: ${exists}`);

        if (exists) {
          this.logger.debug(
            `Getting files from ${testCasePath} with filter 'base'`,
          );

          this.appSystemService
            .getFolders(testCasePath, FILTER_STRINGS.BASE, false)
            .then((files: any) => {
              this.logger.debug(`Got files: ${JSON.stringify(files)}`);

              if (files && files.length > 0) {
                this.logger.debug(`Found ${files.length} test case files`);
                Promise.all(
                  files.map(async (fileName: string) => {
                    const content = await this.appSystemService.readFile(
                      joinPaths(this.currentProject, REQUIREMENT_TYPE.TC, userStoryId, fileName),
                    );
                    try {
                      const testCase = JSON.parse(content);

                      if (testCase && testCase.id) {
                        this.testCaseUserStoryMap.set(testCase.id, userStoryId);
                      }

                      return testCase;
                    } catch (error) {
                      this.logger.error(
                        `Error parsing test case file ${fileName}:`,
                        error,
                      );
                      return null;
                    }
                  }),
                )
                  .then((testCases: any[]) => {
                    const validTestCases = testCases.filter(
                      (tc) => tc !== null,
                    );
                    this.logger.debug(
                      `Loaded ${validTestCases.length} test cases`,
                    );

                    this.testCases = validTestCases;
                    this.testCases$.next(validTestCases);
                  })
                  .catch((error) => {
                    this.logger.error('Error loading test cases:', error);
                  });
              } else {
                this.logger.debug('No test case files found in directory');
              }
            })
            .catch((error) => {
              this.logger.error('Error listing test case files:', error);
            });
        } else {
          this.logger.debug(
            `No test cases found for user story ${userStoryId}`,
          );
        }
      })
      .catch((error: any) => {
        this.logger.error(`Error checking for test cases: ${error}`);
      });
  }

  fetchUserStoryDetails(userStoryId: string) {
    this.logger.debug(`Fetching user story details for ${userStoryId}`);

    if (this.navigation.selectedRequirement?.id === userStoryId) {
      this.logger.debug(
        'User story details already available in navigation state',
      );
      return;
    }

    this.store
      .select(ProjectsState.getProjectsFolders)
      .subscribe((folders: any[]) => {
        const prdFolder = folders.find((folder) => folder.name === 'PRD');
        if (prdFolder) {
          prdFolder.children.forEach((prdFile: string) => {
            if (prdFile.includes('-feature.json')) {
              this.store
                .dispatch(new ReadFile(`PRD/${prdFile}`))
                .subscribe((fileContent: any) => {
                  if (fileContent && fileContent.features) {
                    const userStory = fileContent.features.find(
                      (story: any) => story.id === userStoryId,
                    );
                    if (userStory) {
                      this.logger.debug('Found user story:', userStory);
                      this.navigation.selectedRequirement = userStory;
                    }
                  }
                });
            }
          });
        }
      });
  }

  navigateToAddTestCase() {
    const userStoryId =
      this.route.snapshot.paramMap.get('userStoryId') ||
      this.navigation.selectedRequirement?.id;

    if (!userStoryId) {
      this.toast.showError('Please select a user story to add a test case');
      return;
    }

    this.store.dispatch(new SetSelectedUserStory(userStoryId));

    this.logger.debug(
      `Navigating to add test case for user story ${userStoryId}`,
    );

    this.router.navigate(['/test-case', userStoryId, 'add']);
  }

  navigateToEditTestCase(selectedTestCase: ITestCase) {
    this.logger.debug('Navigating to test case detail:', selectedTestCase);

    const userStoryId = this.testCaseUserStoryMap.get(selectedTestCase.id);

    if (!userStoryId) {
      this.toast.showError(
        `Could not determine user story for test case ${selectedTestCase.id}`,
      );
      return;
    }

    this.store.dispatch(new SetSelectedUserStory(userStoryId));

    this.router.navigate(
      ['/test-case', userStoryId, selectedTestCase.id, 'view'],
      {
        queryParams: {
          projectName: this.navigation.projectId
        }
      },
    );
  }

  async generateTestCases(
    regenerate: boolean = false,
    extraContext: string = '',
    userScreensInvolved: string = '',
  ) {
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');

    if (!this.navigation.selectedRequirement?.id && !userStoryId) {
      this.toast.showError('Please select a user story to generate test cases');
      return;
    }

    const storyId = this.navigation.selectedRequirement?.id || userStoryId || '';
    if (storyId) {
      this.store.dispatch(new SetSelectedUserStory(storyId));
    }

    this.logger.debug(
      'Current navigation state in generateTestCases:',
      this.navigation,
    );

    this.setupTestCaseProgressListener();
    
    await this.workflowProgressService.setCreating(
      this.userStoryId,
      WorkflowType.TestCase
    );
    
    this.showThinkingProcess = true;

    let request: ITestCaseRequest = {
      appId: this.navigation.projectId,
      appName: this.metadata.name,
      appDescription: this.metadata.description,
      userStoryId: this.navigation.userStoryInfo.id || userStoryId || '',
      userStoryTitle: this.navigation.userStoryInfo.name || '',
      userStoryDescription: this.navigation.userStoryInfo.description || '',
      prdId: this.navigation.prdInfo.prdId,
      prdTitle: this.navigation.prdInfo.prdTitle,
      prdDescription: this.navigation.prdInfo.prdDescription,
      acceptanceCriteria: '',
      technicalDetails: this.metadata.technicalDetails || '',
      userScreensInvolved: userScreensInvolved,
      extraContext: extraContext,
      regenerate: regenerate,
    };

    this.logger.debug(
      'Generating test cases with the following information:',
      request,
    );

    this.testCaseService
      .generateTestCases(request)
      .then((response) => {
        if (!response.testCases || !Array.isArray(response.testCases) || response.testCases.length === 0) {
          this.toast.showError("No test cases were generated. Please try again.");
          throw new Error('No test cases were generated. Please try again.');
        }
        
        this.testCases = response.testCases;
        this.updateWithTestCases(this.testCases, regenerate);
      })
      .catch(async (error) => {
        await this.workflowProgressService.setFailed(
          this.userStoryId,
          WorkflowType.TestCase,
          {
            timestamp: new Date().toISOString(),
            reason: error?.message || 'Failed to generate test cases',
          }
        );
        
        this.showThinkingProcess = false;
        
        const errorMessage = error?.message || 'Failed to generate test cases';
        this.toast.showError(
          `${TOASTER_MESSAGES.ENTITY.GENERATE.FAILURE(this.entityType, regenerate)} - ${errorMessage}`
        );
        
        this.dialogService.confirm({
          title: 'Test Case Generation Failed',
          description: `Failed to generate test cases: ${errorMessage}. Would you like to try again?`,
          confirmButtonText: 'Try Again',
          cancelButtonText: 'Cancel',
        }).subscribe((shouldRetry) => {
          if (shouldRetry) {
            this.generateTestCases(regenerate, extraContext, userScreensInvolved);
          }
        });
      });
    this.dialogService.closeAll();
  }

  updateWithTestCases(testCases: ITestCase[], regenerate: boolean = false) {
    const userStoryId =
      this.navigation.userStoryInfo?.id ||
      this.route.snapshot.paramMap.get('userStoryId') ||
      '';

    if (!userStoryId) {
      this.toast.showError('User story ID not found');
      this.showThinkingProcess = false;
      return;
    }

    this.logger.debug(
      `Updating with test cases for user story: ${userStoryId}`,
    );

    testCases.forEach((testCase) => {
      if (testCase.id) {
        this.testCaseUserStoryMap.set(testCase.id, userStoryId);
      }
    });

    const testCasePath = joinPaths(this.currentProject, RequirementTypeEnum.TC, userStoryId);
    this.appSystemService.createDirectory(testCasePath);

    if (regenerate) {
      this.logger.debug(
        'Regenerating test cases - checking for existing files to remove',
      );
      this.appSystemService
        .getFolders(testCasePath, 'base', false)
        .then((files: any) => {
          if (files && files.length > 0) {
            this.logger.debug(
              `Found ${files.length} existing test case files to remove`,
            );
            Promise.all(
              files.map((fileName: string) => {
                const filePath = joinPaths(REQUIREMENT_TYPE.TC, userStoryId, fileName);
                return firstValueFrom(this.store.dispatch(new ArchiveFile(filePath)));
              }),
            )
              .then(() => {
                this.logger.debug(
                  'Successfully archived existing test case files',
                );
                this.createNewTestCaseFiles(
                  testCases,
                  userStoryId,
                  testCasePath,
                  regenerate,
                );
              })
              .catch((error) => {
                this.logger.error(
                  'Error archiving existing test case files:',
                  error,
                );
                this.createNewTestCaseFiles(
                  testCases,
                  userStoryId,
                  testCasePath,
                  regenerate,
                );
              });
          } else {
            this.createNewTestCaseFiles(
              testCases,
              userStoryId,
              testCasePath,
              regenerate,
            );
          }
        })
        .catch((error) => {
          this.logger.error(
            'Error checking for existing test case files:',
            error,
          );
          this.createNewTestCaseFiles(
            testCases,
            userStoryId,
            testCasePath,
            regenerate,
          );
        });
    } else {
      this.createNewTestCaseFiles(
        testCases,
        userStoryId,
        testCasePath,
        regenerate,
      );
    }
  }

  private createNewTestCaseFiles(
    testCases: ITestCase[],
    userStoryId: string,
    testCasePath: string,
    regenerate: boolean = false,
  ) {
    const nextTestCaseId = this.requirementIdService.getNextRequirementId(
      REQUIREMENT_TYPE.TC,
    );
    this.logger.debug(`Starting test case numbering from ${nextTestCaseId}`);

    const testCaseIds: string[] = [];

    Promise.all(
      testCases.map((testCase, index) => {
        const tcNumber = (nextTestCaseId + index).toString().padStart(2, '0');
        const fileName = `TC${tcNumber}-base.json`;
        const filePath = joinPaths(testCasePath, fileName);
        testCase.id = `${REQUIREMENT_TYPE.TC}${tcNumber}`;

        testCaseIds.push(testCase.id);

        this.testCaseUserStoryMap.set(testCase.id, userStoryId);

        this.logger.debug(
          `Creating file ${fileName} for test case ${testCase.id}`,
        );

        return this.appSystemService.createFileWithContent(
          filePath,
          JSON.stringify(testCase),
        );
      }),
    )
      .then(() => {
        this.requirementIdService.updateRequirementCounters({
          [REQUIREMENT_TYPE.TC]: nextTestCaseId + testCases.length - 1,
        });

        this.logger.debug(
          `Successfully created ${testCases.length} test case files`,
        );
        this.logger.debug(
          `Updated test case count to ${nextTestCaseId + testCases.length - 1}`,
        );

        const routeUserStoryId = this.route.snapshot.paramMap.get('userStoryId');
        this.logger.debug(
          `Refreshing test cases for user story ${routeUserStoryId}`,
        );

        if (routeUserStoryId) {
          this.loadTestCasesForUserStory(routeUserStoryId);
        }

        this.workflowProgressService.setComplete(
          this.userStoryId,
          WorkflowType.TestCase
        ).then(() => {
          this.toast.showSuccess(
            TOASTER_MESSAGES.ENTITY.GENERATE.SUCCESS(this.entityType, regenerate),
          );
        });
      })
      .catch((error) => {
        this.logger.error('Error creating test case files:', error);
        this.toast.showError('Failed to create test case files');
        this.showThinkingProcess = false;
      });
  }

  copyTestCaseContent(event: Event, testCase: ITestCase) {
    event.stopPropagation();
    const testCaseContent = `${testCase.id}: ${testCase.title}\n${testCase.description || ''}`;
    const success = this.clipboardService.copyToClipboard(testCaseContent);
    if (success) {
      this.toast.showSuccess(
        TOASTER_MESSAGES.ENTITY.COPY.SUCCESS(this.entityType, testCase.id),
      );
    } else {
      this.toast.showError(
        TOASTER_MESSAGES.ENTITY.COPY.FAILURE(this.entityType, testCase.id),
      );
    }
  }
  
  getTestCaseBorderClass(testCase: ITestCase): string {
    return this.testCaseService.getTestCaseBorderClass(testCase);
  }
  
  getTestCaseStatusIndicator(testCase: ITestCase): CardStatusIndicator {
    return this.testCaseService.getTestCaseStatusIndicator(testCase);
  }
  
  getTestCaseBadges(testCase: ITestCase): CardBadge[] {
    return this.testCaseService.getTestCaseBadges(testCase);
  }

  addMoreContext(regenerate: boolean = false) {
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');

    this.logger.debug(
      `addMoreContext called. userStoryId: ${userStoryId}, selectedRequirement: ${this.navigation.selectedRequirement?.id}`,
    );

    this.logger.debug('Opening modal for user story specific view');
    this.openTestCaseContextModal(regenerate);
  }

  private openTestCaseContextModal(
    regenerate: boolean,
    userStories: IUserStory[] = [],
  ) {
    if (userStories.length > 0) {
      this.logger.debug('Sample user stories:', userStories.slice(0, 3));
    }

    this.dialogService
      .createBuilder()
      .forComponent(TestCaseContextModalComponent)
      .withData({
        title: 'Generate Test Cases',
        userStories: userStories,
      })
      .withWidth('600px')
      .open()
      .afterClosed()
      .subscribe((formValues) => {
        if (formValues !== undefined) {
          this.logger.debug('Modal closed with values:', formValues);

          const userScreensInvolved = formValues.userScreensInvolved || '';
          const extraContext = formValues.extraContext || '';

          if (formValues.selectedUserStoryId) {
            this.logger.debug(
              `Selected user story ID: ${formValues.selectedUserStoryId}`,
            );

            const selectedUserStory = userStories.find(
              (story) => story.id === formValues.selectedUserStoryId,
            );
            if (selectedUserStory) {
              this.logger.debug(
                'Found selected user story:',
                selectedUserStory,
              );

              this.navigation.selectedRequirement = selectedUserStory;
              
              this.store.dispatch(new SetSelectedUserStory(selectedUserStory.id));
            } else {
              this.toast.showError('Selected user story not found');
              return;
            }
          }

          this.generateTestCases(regenerate, extraContext, userScreensInvolved);
        } else {
          this.logger.debug('Modal closed without values');
        }
      });
  }

  exportOptions = [
    {
      label: 'Copy JSON to Clipboard',
      callback: () => this.exportTestCases('json'),
    },
    {
      label: 'Download as Excel (.xlsx)',
      callback: () => this.exportTestCases('xlsx'),
    },
  ];

  exportTestCases(format: string) {
    // Implementation for exporting test cases
  }

  setupWorkflowProgressListener() {
    if (!this.userStoryId) {
      this.logger.debug('Cannot set up workflow progress listener: no user story ID available');
      return;
    }
    this.logger.debug(`Setting up workflow progress listener for user story ${this.userStoryId}`);
    
    try {
      this.electronService.removeWorkflowProgressListener(
        WorkflowType.TestCase,
        this.userStoryId,
        this.workflowProgressListener
      );
    } catch (error) {
    }

    this.electronService.listenWorkflowProgress(
      WorkflowType.TestCase,
      this.userStoryId,
      this.workflowProgressListener
    );
    
    this.logger.debug('Workflow progress listener set up successfully');
  }

  setupTestCaseProgressListener(): void {
    if (!this.userStoryId) {
      this.logger.debug('Cannot set up test case progress listener: no user story ID available');
      return;
    }

    this.logger.debug(`Setting up test case progress listener for user story ${this.userStoryId}`);
    
    if (!this.workflowProgressService.hasGlobalListener(this.userStoryId, WorkflowType.TestCase)) {
      this.workflowProgressService.registerGlobalListener(this.userStoryId, WorkflowType.TestCase);
      this.logger.debug('Registered global listener for test case workflow');
    }
    
    this.workflowProgressService.clearProgressEvents(this.userStoryId, WorkflowType.TestCase);
    
    this.logger.debug('Test case progress listener set up successfully');
  }

  closeProgressDialog(): void {
    this.showProgressDialog = false;
    this.showThinkingProcess = false;

    if (this.userStoryId) {
      this.workflowProgressService.clearCreationStatus(
        this.userStoryId,
        WorkflowType.TestCase
      );
      this.workflowProgressService.clearProgressEvents(
        this.userStoryId,
        WorkflowType.TestCase
      );
    }
  }

  ngOnDestroy() {
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId') || 
                        this.navigation.selectedRequirement?.id;
    
    if (userStoryId) {
      this.electronService.removeWorkflowProgressListener(
        WorkflowType.TestCase,
        userStoryId,
        this.workflowProgressListener,
      );
      
      if (this.workflowProgressService.hasGlobalListener(userStoryId, WorkflowType.TestCase)) {
        this.workflowProgressService.removeGlobalListener(userStoryId, WorkflowType.TestCase);
        this.logger.debug('Removed global listener for test case workflow');
      }
    }

    this.store.dispatch(new DeleteBreadcrumb(this.currentLabel));
  }
}
