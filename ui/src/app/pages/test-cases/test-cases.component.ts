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
import { getNavigationParams } from '../../utils/common.utils';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { ListItemComponent } from '../../components/core/list-item/list-item.component';
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

  // Observable for grouped test cases
  groupedTestCases$ = new BehaviorSubject<
    {
      userStory: { id: string; name: string };
      testCases: ITestCase[];
    }[]
  >([]);

  filteredTestCases$ = this.searchService.filterItems(
    this.testCases$,
    this.searchTerm$,
    (testCase: ITestCase) => [testCase.id, testCase.title],
  );

  /**
   * Get unique user story IDs from the test case map
   * @returns Array of unique user story IDs
   */
  getUserStoryIds(): string[] {
    const userStoryIds = new Set<string>();

    this.testCaseUserStoryMap.forEach((userStoryId) => {
      userStoryIds.add(userStoryId);
    });

    return Array.from(userStoryIds);
  }

  /**
   * Get test cases for a specific user story
   * @param userStoryId User story ID to filter by
   * @returns Array of test cases for the specified user story
   */
  getTestCasesForUserStory(userStoryId: string): ITestCase[] {
    return this.testCasesInState.filter(
      (testCase) => this.testCaseUserStoryMap.get(testCase.id) === userStoryId,
    );
  }

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
    // Get navigation state directly from router
    const navigation = this.router.getCurrentNavigation();
    if (navigation && navigation.extras && navigation.extras.state) {
      const state = navigation.extras.state as any;
      this.navigation = {
        projectId: state.projectId || '',
        folderName: state.folderName || '',
        fileName: state.fileName || '',
        selectedRequirement: state.selectedRequirement || {},
        data: state.data || {},
      };
      this.logger.debug('Navigation state from router:', this.navigation);
    } else {
      this.navigation = getNavigationParams(this.router.getCurrentNavigation());
      this.logger.debug(
        'Navigation state from getNavigationParams:',
        this.navigation,
      );
    }

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

    // Add breadcrumb
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.currentLabel,
        tooltipLabel: this.navigation.selectedRequirement?.name
          ? `Test Cases for ${this.navigation.selectedRequirement.id}: ${this.navigation.selectedRequirement.name}`
          : `Test Cases for ${userStoryId}`,
      }),
    );

    this.store.select(ProjectsState.getMetadata).subscribe((res) => {
      this.metadata = res;
    });
  }

  ngOnInit() {
    // Get the user story ID from route params
    if (this.isGlobalView) {
      this.navigation.selectedRequirement = {};
    }

    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');
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

      if (project) {
        if (userStoryId) {
          // Load test cases for a specific user story
          this.loadTestCasesForUserStory(userStoryId);
        } else {
          // Load all test cases when no user story ID is provided
          this.loadAllTestCases();
        }
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

    // Get project folders for user story selection in global view
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

  /**
   * Loads all test cases from all user story directories
   */
  loadAllTestCases() {
    const tcBasePath = `${this.currentProject}/TC`;

    console.log(`[DEBUG] Loading all test cases from ${tcBasePath}`);
    this.logger.debug(`Loading all test cases from ${tcBasePath}`);

    this.appSystemService
      .fileExists(tcBasePath)
      .then((exists: boolean) => {
        console.log(`[DEBUG] TC directory exists: ${exists}`);
        this.logger.debug(`TC directory exists: ${exists}`);

        if (!exists) {
          console.log(
            '[DEBUG] TC directory does not exist, no test cases to load',
          );
          this.logger.debug(
            'TC directory does not exist, no test cases to load',
          );
          // Set an empty array to indicate no test cases found
          this.testCases = [];
          this.testCases$.next([]);
          return;
        }

        // First, get a list of all directories in TC folder
        this.appSystemService
          .getFolders(tcBasePath, 'base', true)
          .then((userStoryDirNames: any[]) => {
            console.log(
              `[DEBUG] User story directories in TC folder:`,
              userStoryDirNames,
            );
            this.logger.debug(
              `User story directories in TC folder:`,
              userStoryDirNames,
            );

            if (!userStoryDirNames || userStoryDirNames.length === 0) {
              console.log(
                '[DEBUG] No user story directories found in TC folder',
              );
              this.logger.debug('No user story directories found in TC folder');
              return;
            }

            let allTestCases: ITestCase[] = [];
            let loadedCount = 0;
            let processedDirs = 0;

            // Process each user story directory
            userStoryDirNames.forEach((userStoryDir: any) => {
              // Skip if it's not a valid directory object
              if (!userStoryDir.name || !userStoryDir.children) {
                console.log(
                  `[DEBUG] Invalid user story directory:`,
                  userStoryDir,
                );
                processedDirs++;
                return;
              }

              const userStoryId = userStoryDir.name;
              console.log(
                `[DEBUG] Processing user story directory: ${userStoryId}`,
              );

              // Filter for base test case files
              const testCaseFiles = userStoryDir.children.filter(
                (file: string) => file.includes('-base.json'),
              );

              console.log(
                `[DEBUG] Found ${testCaseFiles.length} test case files in ${userStoryId}`,
              );

              if (testCaseFiles.length === 0) {
                processedDirs++;
                if (processedDirs === userStoryDirNames.length) {
                  console.log(
                    `[DEBUG] Completed loading all test cases. Total: ${allTestCases.length}`,
                  );
                }
                return;
              }

              // Load each test case file
              Promise.all(
                testCaseFiles.map(async (fileName: string) => {
                  try {
                    const content = await this.appSystemService.readFile(
                      `${this.currentProject}/TC/${userStoryId}/${fileName}`,
                    );
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
                  const validTestCases = testCases.filter((tc) => tc !== null);
                  loadedCount += validTestCases.length;

                  // Add to the collection of all test cases
                  allTestCases = [...allTestCases, ...validTestCases];

                  // Update the UI with all test cases loaded so far
                  this.testCases = allTestCases;
                  this.testCases$.next(allTestCases);

                  processedDirs++;
                  this.logger.debug(
                    `Loaded ${loadedCount} test cases so far from ${processedDirs}/${userStoryDirNames.length} directories`,
                  );

                  // If this is the last directory, log a summary
                  if (processedDirs === userStoryDirNames.length) {
                    this.logger.debug(
                      `Completed loading all test cases. Total: ${allTestCases.length}`,
                    );
                  }
                })
                .catch((error) => {
                  processedDirs++;
                  this.logger.error(
                    `Error loading test cases for ${userStoryId}:`,
                    error,
                  );
                });
            });
          })
          .catch((error) => {
            this.logger.error('Error listing user story directories:', error);
          });
      })
      .catch((error) => {
        this.logger.error(`Error checking for TC directory: ${error}`);
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

    console.log(`Navigating to edit test case ${selectedTestCase.id} for user story ${userStoryId} with global view: ${this.isGlobalView}`);
    this.router.navigate(
      ['/test-case', userStoryId, selectedTestCase.id, 'view'],
      {
        state: {
          fromGlobalView: this.isGlobalView,
        },
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
    // This is important for the global view to show the test cases under the correct user story
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

        // Determine if we're in global view or specific user story view
        const isGlobalView = !this.route.snapshot.paramMap.get('userStoryId');

        this.logger.debug(`Test cases created. isGlobalView: ${isGlobalView}`);

        // Refresh the view based on the current context
        if (isGlobalView) {
          // In global view, reload all test cases to show everything
          this.logger.debug('In global view, refreshing all test cases');
          this.loadAllTestCases();
        } else {
          // In specific user story view, only load test cases for that user story
          const routeUserStoryId =
            this.route.snapshot.paramMap.get('userStoryId');
          this.logger.debug(
            `In specific view, refreshing test cases for user story ${routeUserStoryId}`,
          );

          if (routeUserStoryId) {
            this.loadTestCasesForUserStory(routeUserStoryId);
          }
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

  // Store all user stories for the global view
  allUserStories: IUserStory[] = [];

  /**
   * Opens a modal to collect additional context for test case generation
   * @param regenerate Whether this is a regeneration operation
   */
  addMoreContext(regenerate: boolean = false) {
    // Check if we're in a specific user story view or global view
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');
    const isGlobalView =
      !userStoryId && !this.navigation.selectedRequirement?.id;

    this.logger.debug(
      `addMoreContext called. isGlobalView: ${isGlobalView}, userStoryId: ${userStoryId}, selectedRequirement: ${this.navigation.selectedRequirement?.id}`,
    );

    // If in global view, we need to fetch all user stories first
    if (isGlobalView) {
      this.logger.debug('In global view, fetching all user stories');
      this.fetchAllUserStories().then((userStories) => {
        this.logger.debug(`Fetched ${userStories.length} user stories`);
        this.openTestCaseContextModal(regenerate, isGlobalView, userStories);
      });
    } else {
      // In user story specific view, just open the modal
      this.logger.debug(
        'In user story specific view, opening modal without user stories',
      );
      this.openTestCaseContextModal(regenerate, isGlobalView);
    }
  }

  /**
   * Fetches all user stories from PRD files
   * @returns Promise with array of user stories
   */
  private async fetchAllUserStories(): Promise<IUserStory[]> {
    if (this.allUserStories.length > 0) {
      this.logger.debug(
        `Returning ${this.allUserStories.length} cached user stories`,
      );
      return this.allUserStories;
    }

    try {
      // Create some mock user stories for testing
      const mockUserStories: IUserStory[] = [
        {
          id: 'US1',
          name: 'User Story 1',
          description: 'Description 1',
          prdId: 'PRD01',
        },
        {
          id: 'US2',
          name: 'User Story 2',
          description: 'Description 2',
          prdId: 'PRD01',
        },
        {
          id: 'US3',
          name: 'User Story 3',
          description: 'Description 3',
          prdId: 'PRD02',
        },
        {
          id: 'US4',
          name: 'User Story 4',
          description: 'Description 4',
          prdId: 'PRD02',
        },
      ];

      this.logger.debug(
        `Created ${mockUserStories.length} mock user stories for testing`,
      );
      this.allUserStories = mockUserStories;
      return mockUserStories;

      /* Commenting out the actual implementation for now
      // Check if PRD folder exists
      const prdFolderExists = await this.appSystemService.fileExists(`${this.currentProject}/PRD`);
      if (!prdFolderExists) {
        this.logger.debug('PRD folder does not exist');
        return [];
      }
      
      // Get all files in PRD folder directly
      const files = await this.appSystemService.getFolders(`${this.currentProject}/PRD`, '', false);
      this.logger.debug('All files in PRD folder:', files);
      
      // Filter for feature files
      const featureFiles = files.filter((file: any) => 
        typeof file === 'string' ? file.includes('-feature.json') : 
        file.name && file.name.includes('-feature.json')
      );
      
      this.logger.debug(`Found ${featureFiles.length} feature files in PRD folder:`, featureFiles);
      
      if (featureFiles.length === 0) {
        return [];
      }
      
      // Read each feature file and extract user stories
      const userStories: IUserStory[] = [];
      
      for (const file of featureFiles) {
        const fileName = typeof file === 'string' ? file : file.name;
        this.logger.debug(`Reading feature file: ${fileName}`);
        
        try {
          const content = await this.appSystemService.readFile(`${this.currentProject}/PRD/${fileName}`);
          const parsedContent = JSON.parse(content);
          this.logger.debug(`Parsed content for ${fileName}:`, parsedContent);
          
          if (parsedContent.features && Array.isArray(parsedContent.features)) {
            // Add the PRD ID to each user story for better identification
            const prdId = fileName.split('-')[0]; // Extract PRD ID from filename
            this.logger.debug(`PRD ID: ${prdId}, Found ${parsedContent.features.length} user stories`);
            
            const storiesWithPrdInfo = parsedContent.features.map((story: IUserStory) => ({
              ...story,
              prdId: prdId
            }));
            
            userStories.push(...storiesWithPrdInfo);
          } else {
            this.logger.debug(`No features array found in ${fileName}`);
          }
        } catch (error) {
          this.logger.error(`Error processing feature file ${fileName}:`, error);
        }
      }
      
      this.logger.debug(`Fetched ${userStories.length} user stories from PRD files`);
      this.allUserStories = userStories;
      return userStories;
      */
    } catch (error) {
      this.logger.error('Error fetching user stories:', error);
      return [];
    }
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
    return !this.route.snapshot.paramMap.get('userStoryId');
  }
}
