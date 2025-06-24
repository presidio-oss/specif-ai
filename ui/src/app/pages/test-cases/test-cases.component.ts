import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  NgZone,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { WorkflowProgressDialogComponent } from '../../components/workflow-progress/workflow-progress-dialog/workflow-progress-dialog.component';
import { Router, ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { ArchiveFile, ReadFile } from '../../store/projects/projects.actions';
import { UserStoriesState } from '../../store/user-stories/user-stories.state';
import { SetSelectedUserStory } from '../../store/user-stories/user-stories.actions';
import { RequirementIdService } from '../../services/requirement-id.service';
import { IUserStory } from '../../model/interfaces/IUserStory';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { ListItemComponent } from '../../components/core/list-item/list-item.component';
import { UnifiedCardComponent, CardStatusIndicator, CardBadge } from '../../components/unified-card/unified-card.component';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import {
  FILTER_STRINGS,
  REQUIREMENT_TYPE,
  TOASTER_MESSAGES,
} from '../../constants/app.constants';
import { SearchInputComponent } from '../../components/core/search-input/search-input.component';
import { BehaviorSubject, firstValueFrom, take } from 'rxjs';
import { TestCaseContextModalComponent } from 'src/app/components/test-case-context-modal/test-case-context-modal.component';
import { ExportDropdownComponent } from 'src/app/export-dropdown/export-dropdown.component';
import {
  WorkflowType,
  WorkflowProgressEvent,
} from '../../model/interfaces/workflow-progress.interface';
import { environment } from '../../../environments/environment';
import { TestCaseService } from '../../services/test-case/test-case.service';
import {
  ITestCase,
  ITestCaseRequest,
  ThinkingProcessConfig,
} from '../../model/interfaces/test-case/testcase.interface';
import { SearchService } from '../../services/search/search.service';
import { DialogService } from '../../services/dialog/dialog.service';
import { ClipboardService } from '../../services/clipboard.service';
import { LoadingService } from '../../services/loading.service';
import {
  AddBreadcrumb,
  AddBreadcrumbs,
  DeleteBreadcrumb,
} from '../../store/breadcrumb/breadcrumb.actions';

@Component({
  selector: 'app-test-cases',
  templateUrl: './test-cases.component.html',
  styleUrls: ['./test-cases.component.scss'],
  standalone: true,
  imports: [
    ButtonComponent,
    MatMenuModule,
    AsyncPipe,
    NgIf,
    NgForOf,
    ListItemComponent,
    BadgeComponent,
    SearchInputComponent,
    ExportDropdownComponent,
    MatTooltipModule,
    WorkflowProgressDialogComponent,
    UnifiedCardComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TestCasesComponent implements OnInit, OnDestroy {
  currentProject!: string;
  newFileName: string = '';
  entityType: string = 'TC';
  selectedUserStory: any = {};
  metadata: any = {};
  private searchTerm$ = new BehaviorSubject<string>('');
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
    data: any;
  } = {
    projectId: '',
    folderName: '',
    fileName: '',
    selectedRequirement: {},
    data: {},
  };

  currentLabel: string = '';

  testCases$ = new BehaviorSubject<ITestCase[]>([]);

  // Observable for filtered test cases
  filteredTestCases$ = this.searchService.filterItems(
    this.testCases$,
    this.searchTerm$,
    (testCase: ITestCase) => [testCase.id, testCase.title],
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
  thinkingProcessConfig: ThinkingProcessConfig = {
    title: 'Creating Test Cases',
    subtitle: `Sit back & let the ${environment.ThemeConfiguration.appName} do its job...`,
  };
  zone = inject(NgZone);

  private workflowProgressListener = (
    event: any,
    data: WorkflowProgressEvent,
  ) => {
    this.zone.run(() => {
      this.testCaseCreationProgress = [...this.testCaseCreationProgress, data];
    });
  };

  readonly dialogService = inject(DialogService);

  onSearch(term: string) {
    this.searchTerm$.next(term);
  }

  constructor(
    private testCaseService: TestCaseService,
    private clipboardService: ClipboardService,
    private loadingService: LoadingService,
    private electronService: ElectronService,
    private toast: ToasterService,
    private appSystemService: AppSystemService,
    private requirementIdService: RequirementIdService,
  ) {
    // Initialize navigation object with empty values
    this.navigation = {
      projectId: '',
      folderName: '',
      fileName: '',
      selectedRequirement: {},
      data: {},
    };

    // Get the user story ID from route params
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');

    // Set the current label for the breadcrumb
    if (this.navigation.selectedRequirement?.id) {
      this.currentLabel = `${this.navigation.selectedRequirement.id} - Test Cases`;
    } else if (userStoryId) {
      this.currentLabel = `${userStoryId} - Test Cases`;
    } else {
      this.currentLabel = 'Test Cases';
    }

    // Add breadcrumbs with proper navigation path
    this.store.dispatch(
      new AddBreadcrumb({
        label: 'Test Cases',
        tooltipLabel: 'Test Cases Home',
        url: `/test-cases-home?projectId=${this.navigation.projectId || this.currentProject}`
      })
    );
    
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.currentLabel,
        tooltipLabel: this.navigation.selectedRequirement?.name
          ? `Test Cases for ${this.navigation.selectedRequirement.id}: ${this.navigation.selectedRequirement.name}`
          : `Test Cases for ${userStoryId}`,
      })
    );

    this.store.select(ProjectsState.getMetadata).subscribe((res) => {
      this.metadata = res;
    });
  }

  ngOnInit() {
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');
    
    // Get projectId from query parameters
    this.route.queryParams.subscribe((params: { [key: string]: string }) => {
      if (params['projectId']) {
        this.navigation.projectId = params['projectId'];
        this.logger.debug(`Project ID from query params: ${this.navigation.projectId}`);
      }
    });
    
    console.log('Navigation Params:', this.navigation);
    
    // If we have a user story ID from the route, set it in the store
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
        // Load test cases for the specific user story
        this.loadTestCasesForUserStory(userStoryId);
      }
    });

    this.selectedFileContent$.subscribe((res: any) => {
      this.requirementFile = res;
    });

    this.testCases$.subscribe((testCases: ITestCase[]) => {
      this.testCasesInState = testCases;
    });

    this.electronService.listenWorkflowProgress(
      WorkflowType.TestCase,
      this.navigation.projectId,
      this.workflowProgressListener,
    );

    // Get project folders for user story selection
    this.store.select(ProjectsState.getProjectsFolders).subscribe((folders) => {
      this.currentProjectFiles = folders;
    });
    
    // Subscribe to the selected user story from the store
    this.selectedUserStory$.subscribe(userStory => {
      if (userStory && (!this.navigation.selectedRequirement || !this.navigation.selectedRequirement.name)) {
        this.logger.debug('Retrieved user story from store:', userStory);
        this.navigation.selectedRequirement = userStory;
        
        // Update the breadcrumb with the user story information
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

  /**
   * Loads test cases for a specific user story
   * @param userStoryId The ID of the user story to load test cases for
   */
  loadTestCasesForUserStory(userStoryId: string) {
    this.logger.debug(`Loading test cases for user story ${userStoryId}`);

    // Check if the directory exists
    const testCasePath = `${this.currentProject}/TC/${userStoryId}`;
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
              console.log('Test case files:', files);

              if (files && files.length > 0) {
                this.logger.debug(`Found ${files.length} test case files`);
                Promise.all(
                  files.map(async (fileName: string) => {
                    const content = await this.appSystemService.readFile(
                      `${this.currentProject}/TC/${userStoryId}/${fileName}`,
                    );
                    try {
                      const testCase = JSON.parse(content);

                      // Store the user story ID for this test case
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
          // No test cases yet
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
              // Read the PRD file
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
    // Get the user story ID from route params or navigation state
    const userStoryId =
      this.route.snapshot.paramMap.get('userStoryId') ||
      this.navigation.selectedRequirement?.id;

    if (!userStoryId) {
      this.toast.showError('Please select a user story to add a test case');
      return;
    }

    // Store the user story ID in the NgXs store so it can be retrieved when navigating back
    this.store.dispatch(new SetSelectedUserStory(userStoryId));

    this.logger.debug(
      `Navigating to add test case for user story ${userStoryId}`,
    );

    // Navigate to the add test case page
    this.router.navigate(['/test-case', userStoryId, 'add']);
  }

  navigateToEditTestCase(selectedTestCase: ITestCase) {
    this.logger.debug('Navigating to test case detail:', selectedTestCase);

    // Get the user story ID for this test case
    const userStoryId = this.testCaseUserStoryMap.get(selectedTestCase.id);

    if (!userStoryId) {
      this.toast.showError(
        `Could not determine user story for test case ${selectedTestCase.id}`,
      );
      return;
    }

    // Store the user story ID in the NgXs store so it can be retrieved when navigating back
    this.store.dispatch(new SetSelectedUserStory(userStoryId));

    console.log(`Navigating to edit test case ${selectedTestCase.id} for user story ${userStoryId}`);
    this.router.navigate(
      ['/test-case', userStoryId, selectedTestCase.id, 'view'],
      {
        queryParams: {
          projectId: this.navigation.projectId
        }
      },
    );
  }

  generateTestCases(
    regenerate: boolean = false,
    extraContext: string = '',
    userScreensInvolved: string = '',
  ) {
    // The user story ID should be available from the route params
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');

    if (!this.navigation.selectedRequirement?.id && !userStoryId) {
      this.toast.showError('Please select a user story to generate test cases');
      return;
    }

    // Store the user story ID in the NgXs store
    const storyId = this.navigation.selectedRequirement?.id || userStoryId || '';
    if (storyId) {
      this.store.dispatch(new SetSelectedUserStory(storyId));
    }

    // Log the current navigation state
    this.logger.debug(
      'Current navigation state in generateTestCases:',
      this.navigation,
    );

    // Start the thinking process early to give feedback to the user
    this.testCaseCreationProgress = [];
    this.showThinkingProcess = true;

    // Create the request with the available information
    let request: ITestCaseRequest = {
      appId: this.navigation.projectId,
      appName: this.metadata.name,
      appDescription: this.metadata.description,
      userStoryId: this.navigation.selectedRequirement?.id || userStoryId || '',
      userStoryTitle: this.navigation.selectedRequirement?.name || '',
      userStoryDescription:
        this.navigation.selectedRequirement?.description || '',
      acceptanceCriteria: '',
      technicalDetails: this.metadata.technicalDetails || '',
      userScreensInvolved: userScreensInvolved,
      extraContext: extraContext,
      regenerate: regenerate,
    };

    // Log the request to show what information is being sent
    this.logger.debug(
      'Generating test cases with the following information:',
      request,
    );

    this.testCaseService
      .generateTestCases(request)
      .then((response) => {
        this.testCases = response.testCases;
        this.updateWithTestCases(this.testCases, regenerate);
      })
      .catch((error) => {
        this.showThinkingProcess = false;
        this.toast.showError(
          TOASTER_MESSAGES.ENTITY.GENERATE.FAILURE(this.entityType, regenerate),
        );
      });
    this.dialogService.closeAll();
  }

  /**
   * Updates the system with newly generated test cases
   * @param testCases Array of test cases to save
   * @param regenerate Whether this is a regeneration operation
   */
  updateWithTestCases(testCases: ITestCase[], regenerate: boolean = false) {
    // Get the user story ID from route params if not available in navigation
    const userStoryId =
      this.navigation.selectedRequirement?.id ||
      this.route.snapshot.paramMap.get('userStoryId') ||
      '';

    if (!userStoryId) {
      this.toast.showError('User story ID not found');
      return;
    }

    // Log the user story ID for debugging
    this.logger.debug(
      `Updating with test cases for user story: ${userStoryId}`,
    );

    // Update the test case user story map for all new test cases
    testCases.forEach((testCase) => {
      if (testCase.id) {
        this.testCaseUserStoryMap.set(testCase.id, userStoryId);
      }
    });

    const testCasePath = `${this.currentProject}/TC/${userStoryId}`;
    this.appSystemService.createDirectory(testCasePath);

    // If regenerating, first check if there are existing test case files to remove
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
            // Remove existing files before creating new ones
            Promise.all(
              files.map((fileName: string) => {
                const filePath = `TC/${userStoryId}/${fileName}`;
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
                // Continue with creating new files even if archiving failed
                this.createNewTestCaseFiles(
                  testCases,
                  userStoryId,
                  testCasePath,
                  regenerate,
                );
              });
          } else {
            // No existing files to remove
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
          // Continue with creating new files even if checking failed
          this.createNewTestCaseFiles(
            testCases,
            userStoryId,
            testCasePath,
            regenerate,
          );
        });
    } else {
      // Not regenerating, just create new files
      this.createNewTestCaseFiles(
        testCases,
        userStoryId,
        testCasePath,
        regenerate,
      );
    }
  }

  /**
   * Creates new test case files with proper numbering
   * @param testCases Array of test cases to save
   * @param userStoryId ID of the user story
   * @param testCasePath Path to the test case directory
   * @param regenerate Whether this is a regeneration operation
   */
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
        const filePath = `${testCasePath}/${fileName}`;
        testCase.id = `TC${tcNumber}`;

        testCaseIds.push(testCase.id);

        // Update the test case user story map
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
        // Update the requirement counter using RequirementIdService
        this.requirementIdService.updateRequirementCounters({
          [REQUIREMENT_TYPE.TC]: nextTestCaseId + testCases.length - 1,
        });

        this.logger.debug(
          `Successfully created ${testCases.length} test case files`,
        );
        this.logger.debug(
          `Updated test case count to ${nextTestCaseId + testCases.length - 1}`,
        );

        // Refresh the test cases for the current user story
        const routeUserStoryId = this.route.snapshot.paramMap.get('userStoryId');
        this.logger.debug(
          `Refreshing test cases for user story ${routeUserStoryId}`,
        );

        if (routeUserStoryId) {
          this.loadTestCasesForUserStory(routeUserStoryId);
        }

        // Show success message
        this.showThinkingProcess = false;
        this.toast.showSuccess(
          TOASTER_MESSAGES.ENTITY.GENERATE.SUCCESS(this.entityType, regenerate),
        );
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
  
  /**
   * Returns the appropriate border class based on test case priority
   */
  getTestCaseBorderClass(testCase: ITestCase): string {
    if (!testCase.priority) return 'border-l-4 border-l-blue-500';
    
    switch (testCase.priority.toLowerCase()) {
      case 'high':
        return 'border-l-4 border-l-red-500';
      case 'medium':
        return 'border-l-4 border-l-amber-500';
      case 'low':
        return 'border-l-4 border-l-green-500';
      default:
        return 'border-l-4 border-l-blue-500';
    }
  }
  
  /**
   * Returns the status indicator for a test case
   */
  getTestCaseStatusIndicator(testCase: ITestCase): CardStatusIndicator {
    let icon = 'heroArrowRight';
    let iconBgClass = 'bg-blue-100';
    let iconColorClass = 'text-blue-600';
    let text = testCase.priority || 'Normal';
    
    if (testCase.priority) {
      switch (testCase.priority.toLowerCase()) {
        case 'high':
          icon = 'heroArrowTrendingUp';
          iconBgClass = 'bg-red-100';
          iconColorClass = 'text-red-600';
          break;
        case 'medium':
          icon = 'heroArrowRight';
          iconBgClass = 'bg-amber-100';
          iconColorClass = 'text-amber-600';
          break;
        case 'low':
          icon = 'heroArrowTrendingDown';
          iconBgClass = 'bg-green-100';
          iconColorClass = 'text-green-600';
          break;
      }
    }
    
    return {
      icon,
      iconBgClass,
      iconColorClass,
      text,
      textColorClass: iconColorClass
    };
  }
  
  /**
   * Returns badges for a test case
   */
  getTestCaseBadges(testCase: ITestCase): CardBadge[] {
    const badges: CardBadge[] = [];
    
    // Type badge
    if (testCase.type) {
      badges.push({
        text: testCase.type,
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700'
      });
    }
    
    // Steps count badge
    if (testCase.steps?.length) {
      badges.push({
        text: `${testCase.steps.length} steps`,
        bgClass: 'bg-gray-50',
        textClass: 'text-gray-700'
      });
    }
    
    return badges;
  }

  /**
   * Opens a modal to collect additional context for test case generation
   * @param regenerate Whether this is a regeneration operation
   */
  addMoreContext(regenerate: boolean = false) {
    // Get the user story ID from route params
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');

    this.logger.debug(
      `addMoreContext called. userStoryId: ${userStoryId}, selectedRequirement: ${this.navigation.selectedRequirement?.id}`,
    );

    // Open the modal for the specific user story
    this.logger.debug('Opening modal for user story specific view');
    this.openTestCaseContextModal(regenerate, false);
  }

  /**
   * Opens the test case context modal with appropriate data
   * @param regenerate Whether this is a regeneration operation
   * @param isGlobalView Whether we're in global view (no specific user story)
   * @param userStories Optional array of user stories (for global view)
   */
  private openTestCaseContextModal(
    regenerate: boolean,
    isGlobalView: boolean,
    userStories: IUserStory[] = [],
  ) {
    this.logger.debug(
      `Opening test case context modal. isGlobalView: ${isGlobalView}, userStories: ${userStories.length}`,
    );

    // Log some sample user stories for debugging
    if (userStories.length > 0) {
      this.logger.debug('Sample user stories:', userStories.slice(0, 3));
    }

    this.dialogService
      .createBuilder()
      .forComponent(TestCaseContextModalComponent)
      .withData({
        title: 'Generate Test Cases',
        isGlobalView: isGlobalView,
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

          // If in global view, use the selected user story
          if (isGlobalView && formValues.selectedUserStoryId) {
            this.logger.debug(
              `Selected user story ID: ${formValues.selectedUserStoryId}`,
            );

            // Find the selected user story
            const selectedUserStory = userStories.find(
              (story) => story.id === formValues.selectedUserStoryId,
            );
            if (selectedUserStory) {
              this.logger.debug(
                'Found selected user story:',
                selectedUserStory,
              );

              // Set the selected requirement for test case generation
              this.navigation.selectedRequirement = selectedUserStory;
              
              // Store the user story ID in the NgXs store
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

  ngOnDestroy() {
    this.electronService.removeWorkflowProgressListener(
      WorkflowType.TestCase,
      this.navigation.projectId,
      this.workflowProgressListener,
    );

    // Remove the breadcrumb when the component is destroyed
    this.store.dispatch(new DeleteBreadcrumb(this.currentLabel));
  }

  get isGlobalView(): boolean {
    return false; // Always return false since we only support user story specific view
  }
}
