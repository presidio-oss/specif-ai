import { Component, ElementRef, HostListener, inject, OnInit, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { ReadFile, CreateFile, FileExists, UpdateMetadata } from '../../store/projects/projects.actions';
import { RequirementIdService } from '../../services/requirement-id.service';
import { FeatureService } from '../../services/feature/feature.service';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { ElectronService } from '../../electron-bridge/electron.service';
import { getNavigationParams } from '../../utils/common.utils';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { ListItemComponent } from '../../components/core/list-item/list-item.component';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import { FILTER_STRINGS, REQUIREMENT_TYPE, TOASTER_MESSAGES } from '../../constants/app.constants';
import { SearchInputComponent } from '../../components/core/search-input/search-input.component';
import { BehaviorSubject, map, take } from 'rxjs';
import { ModalDialogCustomComponent } from 'src/app/components/modal-dialog/modal-dialog.component';
import { ExportDropdownComponent } from 'src/app/export-dropdown/export-dropdown.component';
import { ThinkingProcessComponent } from '../../components/thinking-process/thinking-process.component';
import { WorkflowType, WorkflowProgressEvent } from '../../model/interfaces/workflow-progress.interface';
import { ThinkingProcessConfig } from '../../components/thinking-process/thinking-process.config';
import { environment } from '../../../environments/environment';
import { TestCaseService } from '../../services/test-case/test-case.service';
import { ITestCase, ITestCaseRequest } from '../../model/interfaces/test-case/testcase.interface';
import { SearchService } from '../../services/search/search.service';
import { DialogService } from '../../services/dialog/dialog.service';
import { ClipboardService } from '../../services/clipboard.service';
import { LoadingService } from '../../services/loading.service';
import { AddBreadcrumb, DeleteBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';

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
    NgIconComponent,
    NgForOf,
    ListItemComponent,
    BadgeComponent,
    SearchInputComponent,
    ExportDropdownComponent,
    MatTooltipModule,
    ThinkingProcessComponent,
  ],
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

  filteredTestCases$ = this.searchService.filterItems(
    this.testCases$,
    this.searchTerm$,
    (testCase: ITestCase) => [testCase.id, testCase.title],
  );

  selectedProject$ = this.store.select(ProjectsState.getSelectedProject);
  selectedFileContent$ = this.store.select(
    ProjectsState.getSelectedFileContent,
  );

  testCasesInState: ITestCase[] = [];

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
    private featureService: FeatureService,
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
      this.logger.debug('Navigation state from getNavigationParams:', this.navigation);
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
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');
    console.log("Navigation Params:", this.navigation);
    
    this.store.select(ProjectsState.getMetadata).subscribe((res) => {
      this.metadata = res;
    });

    if (this.navigation.fileName) {
      this.store.dispatch(
        new ReadFile(`${this.navigation.folderName}/${this.navigation.fileName}`),
      );
    }

    this.selectedProject$.subscribe((project) => {
      this.currentProject = project;
      this.logger.debug(project, 'selected project');
      
      if (this.navigation.fileName) {
        this.newFileName = this.navigation.fileName.replace('base', 'feature');
      }
      
      if (project && userStoryId) {
        // Try to load existing test cases for this user story
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
  }
  
  loadTestCasesForUserStory(userStoryId: string) {
    this.logger.debug(`Loading test cases for user story ${userStoryId}`);
    
    // Check if the directory exists
    const testCasePath = `${this.currentProject}/TC/${userStoryId}`;
    this.logger.debug(`Checking if directory exists: ${testCasePath}`);
    
    this.appSystemService.fileExists(testCasePath)
      .then((exists: boolean) => {
        this.logger.debug(`Directory exists: ${exists}`);
        
        if (exists) {
          this.logger.debug(`Getting files from ${testCasePath} with filter 'base'`);
          
          this.appSystemService.getFolders(testCasePath, FILTER_STRINGS.BASE, false)
            .then((files: any) => {
              this.logger.debug(`Got files: ${JSON.stringify(files)}`);
              console.log('Test case files:', files);
              
              if (files && files.length > 0) {
                this.logger.debug(`Found ${files.length} test case files`);
                Promise.all(files.map(async (fileName: string) => {
                  const content = await this.appSystemService.readFile(`${this.currentProject}/TC/${userStoryId}/${fileName}`);
                  try {
                    return JSON.parse(content);
                  } catch (error) {
                    this.logger.error(`Error parsing test case file ${fileName}:`, error);
                    return null;
                  }
                }))
                .then((testCases: any[]) => {
                  const validTestCases = testCases.filter(tc => tc !== null);
                  this.logger.debug(`Loaded ${validTestCases.length} test cases`);
                  
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
          this.logger.debug(`No test cases found for user story ${userStoryId}`);
        }
      })
      .catch((error: any) => {
        this.logger.error(`Error checking for test cases: ${error}`);
      });
  }

  fetchUserStoryDetails(userStoryId: string) {
    this.logger.debug(`Fetching user story details for ${userStoryId}`);
    
    if (this.navigation.selectedRequirement?.id === userStoryId) {
      this.logger.debug('User story details already available in navigation state');
      return;
    }
    
    this.store.select(ProjectsState.getProjectsFolders)
      .subscribe((folders: any[]) => {
        const prdFolder = folders.find(folder => folder.name === 'PRD');
        if (prdFolder) {
          prdFolder.children.forEach((prdFile: string) => {
            if (prdFile.includes('-feature.json')) {
              // Read the PRD file
              this.store.dispatch(new ReadFile(`PRD/${prdFile}`))
                .subscribe((fileContent: any) => {
                  if (fileContent && fileContent.features) {
                    const userStory = fileContent.features.find((story: any) => story.id === userStoryId);
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
    // Implementation for adding a new test case
  }

  navigateToEditTestCase(selectedTestCase: ITestCase) {
    // Implementation for editing a test case
  }

  generateTestCases(regenerate: boolean = false, extraContext: string = '') {
    // The user story ID should be available from the route params
    const userStoryId = this.route.snapshot.paramMap.get('userStoryId');
    
    if (!this.navigation.selectedRequirement?.id && !userStoryId) {
      this.toast.showError('Please select a user story to generate test cases');
      return;
    }

    // Log the current navigation state
    this.logger.debug('Current navigation state in generateTestCases:', this.navigation);
    
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
      userStoryDescription: this.navigation.selectedRequirement?.description || '',
      acceptanceCriteria: '',
      technicalDetails: this.metadata.technicalDetails || '',
      extraContext: extraContext,
      regenerate: regenerate,
    };

    // Log the request to show what information is being sent
    this.logger.debug('Generating test cases with the following information:', request);

    this.testCaseService.generateTestCases(request).then((response) => {
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
  updateWithTestCases(
    testCases: ITestCase[],
    regenerate: boolean = false,
  ) {
    // Get the user story ID from route params if not available in navigation
    const userStoryId = this.navigation.selectedRequirement?.id || this.route.snapshot.paramMap.get('userStoryId') || '';
    
    if (!userStoryId) {
      this.toast.showError('User story ID not found');
      return;
    }
    
    const testCasePath = `${this.currentProject}/TC/${userStoryId}`;
    this.appSystemService.createDirectory(testCasePath);

    // If regenerating, first check if there are existing test case files to remove
    if (regenerate) {
      this.logger.debug('Regenerating test cases - checking for existing files to remove');
      this.appSystemService.getFolders(testCasePath, 'base', false)
        .then((files: any) => {
          if (files && files.length > 0) {
            this.logger.debug(`Found ${files.length} existing test case files to remove`);
            // Remove existing files before creating new ones
            Promise.all(files.map((fileName: string) => {
              return this.appSystemService.archiveFile(`${testCasePath}/${fileName}`);
            }))
            .then(() => {
              this.logger.debug('Successfully archived existing test case files');
              this.createNewTestCaseFiles(testCases, userStoryId, testCasePath, regenerate);
            })
            .catch(error => {
              this.logger.error('Error archiving existing test case files:', error);
              // Continue with creating new files even if archiving failed
              this.createNewTestCaseFiles(testCases, userStoryId, testCasePath, regenerate);
            });
          } else {
            // No existing files to remove
            this.createNewTestCaseFiles(testCases, userStoryId, testCasePath, regenerate);
          }
        })
        .catch(error => {
          this.logger.error('Error checking for existing test case files:', error);
          // Continue with creating new files even if checking failed
          this.createNewTestCaseFiles(testCases, userStoryId, testCasePath, regenerate);
        });
    } else {
      // Not regenerating, just create new files
      this.createNewTestCaseFiles(testCases, userStoryId, testCasePath, regenerate);
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
    regenerate: boolean = false
  ) {
    const nextTestCaseId = this.requirementIdService.getNextRequirementId(REQUIREMENT_TYPE.TC);
    this.logger.debug(`Starting test case numbering from ${nextTestCaseId}`);
    
    Promise.all(testCases.map((testCase, index) => {
      const tcNumber = (nextTestCaseId + index).toString().padStart(2, '0');
      const fileName = `TC${tcNumber}-base.json`;
      const filePath = `${testCasePath}/${fileName}`;
      testCase.id = `TC${tcNumber}`;
      
      this.logger.debug(`Creating file ${fileName} for test case ${testCase.id}`);
      
      return this.appSystemService.createFileWithContent(
        filePath,
        JSON.stringify(testCase)
      );
    }))
    .then(() => {
      // Update the requirement counter using RequirementIdService
      this.requirementIdService.updateRequirementCounters({
        [REQUIREMENT_TYPE.TC]: nextTestCaseId + testCases.length - 1
      });
      
      this.logger.debug(`Successfully created ${testCases.length} test case files`);
      this.logger.debug(`Updated test case count to ${nextTestCaseId + testCases.length - 1}`);
      
      // Update the test cases list
      this.testCases$.next(testCases);
      
      // Show success message
      this.showThinkingProcess = false;
      this.toast.showSuccess(
        TOASTER_MESSAGES.ENTITY.GENERATE.SUCCESS(this.entityType, regenerate),
      );
    })
    .catch(error => {
      this.logger.error('Error creating test case files:', error);
      this.toast.showError('Failed to create test case files');
      this.showThinkingProcess = false;
    });
  }

  getLatestTestCases() {
    // Implementation for getting latest test cases
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

  addMoreContext(regenerate: boolean = false) {
    this.dialogService
      .createBuilder()
      .forComponent(ModalDialogCustomComponent)
      .withData({
        title: 'Generate Test Cases',
        description:
          'Include additional context to generate relevant test cases',
        placeholder: 'Add additional context for the test cases',
      })
      .withWidth('600px')
      .open()
      .afterClosed()
      .subscribe((emittedValue) => {
        if (emittedValue !== undefined)
          this.generateTestCases(regenerate, emittedValue);
        return;
      });
  }

  exportOptions = [
    {
      label: 'Copy JSON to Clipboard',
      callback: () => this.exportTestCases('json')
    },
    {
      label: 'Download as Excel (.xlsx)',
      callback: () => this.exportTestCases('xlsx')
    }
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
}
