import { Injectable, inject } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ITestCase, ITestCaseRequest, ITestCasesResponse, TEST_CASE_PRIORITY, TEST_CASE_TYPE, TestCaseStatus } from '../../model/interfaces/test-case/testcase.interface';
import { AppSystemService } from '../app-system/app-system.service';
import { FILTER_STRINGS, REQUIREMENT_TYPE } from '../../constants/app.constants';
import { joinPaths } from '../../utils/path.utils';
import { Observable, from, map, of, throwError, firstValueFrom, BehaviorSubject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { UpdateFile, ArchiveFile } from '../../store/projects/projects.actions';
import { RequirementIdService } from '../requirement-id.service';
import { IUserStory } from '../../model/interfaces/IUserStory';
import { CardStatusIndicator, CardBadge } from '../../components/unified-card/unified-card.component';

export interface SelectOption {
  value: string;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class TestCaseService {
  private logger = inject(NGXLogger);
  private electronService = inject(ElectronService);
  private appSystemService = inject(AppSystemService);
  private store = inject(Store);
  private requirementIdService = inject(RequirementIdService);

  private readonly SELECTED_PRD_KEY = 'selectedPrdId';

  readonly priorityOptions: SelectOption[] = Object.values(TEST_CASE_PRIORITY).map((val) => ({ value: val, label: val }));
  readonly typeOptions: SelectOption[] = Object.values(TEST_CASE_TYPE).map((val) => ({ value: val, label: val }));
  readonly statusOptions: SelectOption[] = Object.values(TestCaseStatus).map((val) => ({ value: val, label: val }));
  
  readonly priorityFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Priorities' },
    { value: 'High', label: 'High Priority' },
    { value: 'Medium', label: 'Medium Priority' },
    { value: 'Low', label: 'Low Priority' }
  ];
  
  readonly typeFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Types' },
    { value: 'Functional', label: 'Functional' },
    { value: 'Integration', label: 'Integration' },
    { value: 'UI/UX', label: 'UI/UX' },
    { value: 'Performance', label: 'Performance' },
    { value: 'Security', label: 'Security' }
  ];
  
  readonly stepsCountFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Steps' },
    { value: '1-3', label: '1-3 Steps' },
    { value: '4-6', label: '4-6 Steps' },
    { value: '7+', label: '7+ Steps' }
  ];

  /**
   * Gets the selected PRD ID from session storage
   * @param projectId The project ID
   * @returns The selected PRD ID or null if not found
   */
  getSelectedPrdId(projectId: string): string | null {
    return sessionStorage.getItem(`${this.SELECTED_PRD_KEY}_${projectId}`);
  }

  /**
   * Sets the selected PRD ID in session storage
   * @param projectId The project ID
   * @param prdId The PRD ID to save
   */
  setSelectedPrdId(projectId: string, prdId: string): void {
    sessionStorage.setItem(`${this.SELECTED_PRD_KEY}_${projectId}`, prdId);
  }

  /**
   * Generates test cases using the LLM
   * @param request The test case generation request
   * @returns A promise that resolves to the generated test cases
   */
  async generateTestCases(request: ITestCaseRequest): Promise<ITestCasesResponse> {
    try {
      this.logger.debug('Generating test cases with request:', request);
      
      const response = await this.electronService.createTestCases(request);
      
      this.logger.debug('Test cases generated successfully:', response);
      return response;
    } catch (error) {
      this.logger.error('Error generating test cases:', error);
      throw error;
    }
  }

  /**
   * Parses the test case response
   * @param response The test case response to parse
   * @returns The parsed test case response
   */
  parseTestCaseResponse(response: ITestCasesResponse | undefined): ITestCasesResponse {
    if (!response || !response.testCases) {
      return { testCases: [] };
    }
    return response;
  }

  /**
   * Constructs a test case file path
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @param testCaseId Optional test case ID
   * @returns The constructed file path
   */
  getTestCaseFilePath(projectId: string, userStoryId: string, testCaseId?: string): string {
    if (testCaseId) {
      return joinPaths(projectId, REQUIREMENT_TYPE.TC, userStoryId, `${testCaseId}-base.json`);
    }
    return joinPaths(projectId, REQUIREMENT_TYPE.TC, userStoryId);
  }

  /**
   * Gets a test case by ID
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @param testCaseId The test case ID
   * @returns An observable that emits the test case
   */
  getTestCase(projectId: string, userStoryId: string, testCaseId: string): Observable<ITestCase> {
    const path = this.getTestCaseFilePath(projectId, userStoryId, testCaseId);
    
    return from(this.appSystemService.readFile(path)).pipe(
      map(content => {
        try {
          return JSON.parse(content) as ITestCase;
        } catch (error) {
          this.logger.error(`Error parsing test case ${testCaseId}:`, error);
          throw new Error(`Failed to parse test case ${testCaseId}`);
        }
      }),
      catchError(error => {
        this.logger.error(`Error reading test case ${testCaseId}:`, error);
        return throwError(() => new Error(`Failed to load test case ${testCaseId}`));
      })
    );
  }

  /**
   * Gets all test cases for a user story
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @returns An observable that emits an array of test cases
   */
  getTestCasesForUserStory(projectId: string, userStoryId: string): Observable<ITestCase[]> {
    const testCasePath = this.getTestCaseFilePath(projectId, userStoryId);
    
    return from(this.appSystemService.fileExists(testCasePath)).pipe(
      switchMap(exists => {
        if (!exists) {
          return of([]);
        }
        return from(this.appSystemService.getFolders(testCasePath, FILTER_STRINGS.BASE, false));
      }),
      catchError(error => {
        this.logger.error(`Error checking if test case directory exists: ${testCasePath}`, error);
        return of([]);
      }),
      switchMap(files => {
        if (!files || files.length === 0) {
          return of([]);
        }
        
        const promises = files.map(async (fileName: string) => {
          try {
            const content = await this.appSystemService.readFile(
              joinPaths(projectId, REQUIREMENT_TYPE.TC, userStoryId, fileName)
            );
            return JSON.parse(content) as ITestCase;
          } catch (error) {
            this.logger.error(`Error parsing test case file ${fileName}:`, error);
            return null;
          }
        });
        
        return from(Promise.all(promises));
      }),
      map(testCases => testCases.filter((tc): tc is ITestCase => tc !== null)),
      catchError(error => {
        this.logger.error(`Error loading test cases for user story ${userStoryId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Saves a test case
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @param testCase The test case to save
   * @param isNew Whether this is a new test case
   * @returns An observable that completes when the test case is saved
   */
  saveTestCase(projectId: string, userStoryId: string, testCase: ITestCase, isNew: boolean): Observable<void> {
    if (isNew) {
      return this.createNewTestCase(projectId, userStoryId, testCase);
    } else {
      return this.updateTestCase(projectId, userStoryId, testCase);
    }
  }

  /**
   * Creates a new test case
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @param testCase The test case to create
   * @returns An observable that completes when the test case is created
   */
  private createNewTestCase(projectId: string, userStoryId: string, testCase: ITestCase): Observable<void> {
    const id = this.requirementIdService.getNextRequirementId(REQUIREMENT_TYPE.TC);
    const tcNumber = id.toString().padStart(2, '0');
    testCase.id = `${REQUIREMENT_TYPE.TC}${tcNumber}`;
    
    const testCasePath = this.getTestCaseFilePath(projectId, userStoryId);
    const fileName = `${testCase.id}-base.json`;
    const filePath = joinPaths(testCasePath, fileName);
    
    return from(this.appSystemService.createDirectory(testCasePath)).pipe(
      switchMap(() => from(this.appSystemService.createFileWithContent(filePath, JSON.stringify(testCase)))),
      map(() => {
        this.requirementIdService.updateRequirementCounters({ [REQUIREMENT_TYPE.TC]: id });
        return;
      }),
      catchError(error => {
        this.logger.error(`Error creating test case file:`, error);
        return throwError(() => new Error('Failed to create test case'));
      })
    );
  }

  /**
   * Updates an existing test case
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @param testCase The test case to update
   * @returns An observable that completes when the test case is updated
   */
  private updateTestCase(projectId: string, userStoryId: string, testCase: ITestCase): Observable<void> {
    const path = joinPaths(REQUIREMENT_TYPE.TC, userStoryId, `${testCase.id}-base.json`);
    return this.store.dispatch(new UpdateFile(path, testCase)).pipe(
      map(() => {}),
      catchError(error => {
        this.logger.error(`Error updating test case ${testCase.id}:`, error);
        return throwError(() => new Error(`Failed to update test case ${testCase.id}`));
      })
    );
  }

  /**
   * Deletes a test case
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @param testCaseId The test case ID
   * @returns An observable that completes when the test case is deleted
   */
  deleteTestCase(projectId: string, userStoryId: string, testCaseId: string): Observable<void> {
    const path = joinPaths(REQUIREMENT_TYPE.TC, userStoryId, `${testCaseId}-base.json`);
    return this.store.dispatch(new ArchiveFile(path)).pipe(
      map(() => {}),
      catchError(error => {
        this.logger.error(`Error deleting test case ${testCaseId}:`, error);
        return throwError(() => new Error(`Failed to delete test case ${testCaseId}`));
      })
    );
  }

  /**
   * Updates the system with newly generated test cases
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @param testCases Array of test cases to save
   * @param regenerate Whether this is a regeneration operation
   * @returns An observable that completes when all test cases are saved
   */
  updateWithTestCases(projectId: string, userStoryId: string, testCases: ITestCase[], regenerate: boolean = false): Observable<void> {
    const testCasePath = this.getTestCaseFilePath(projectId, userStoryId);
    
    // Create the directory if it doesn't exist
    return from(this.appSystemService.createDirectory(testCasePath)).pipe(
      switchMap(() => {
        if (regenerate) {
          // If regenerating, first check if there are existing test case files to remove
          return from(this.appSystemService.getFolders(testCasePath, FILTER_STRINGS.BASE, false));
        }
        return of([]);
      }),
      switchMap(async (files) => {
        if (regenerate && files && files.length > 0) {
          // Remove existing files before creating new ones
          for (const fileName of files) {
            const filePath = joinPaths(REQUIREMENT_TYPE.TC, userStoryId, fileName);
            await firstValueFrom(this.store.dispatch(new ArchiveFile(filePath)));
          }
        }
        
        // Create new test case files
        await this.createNewTestCaseFiles(projectId, userStoryId, testCases);
      }),
      map(() => {}),
      catchError(error => {
        this.logger.error(`Error updating test cases:`, error);
        return throwError(() => new Error('Failed to update test cases'));
      })
    );
  }

  /**
   * Creates new test case files
   * @param projectId The project ID
   * @param userStoryId The user story ID
   * @param testCases Array of test cases to create
   * @returns A promise that resolves when all test cases are created
   */
  private async createNewTestCaseFiles(projectId: string, userStoryId: string, testCases: ITestCase[]): Promise<void> {
    // Get the next test case ID
    let nextId = this.requirementIdService.getNextRequirementId(REQUIREMENT_TYPE.TC);
    
    // Create test case files
    for (const testCase of testCases) {
      const tcNumber = nextId.toString().padStart(2, '0');
      testCase.id = `TC${tcNumber}`;
      
      const filePath = this.getTestCaseFilePath(projectId, userStoryId, testCase.id);
      
      try {
        await this.appSystemService.createFileWithContent(filePath, JSON.stringify(testCase));
        nextId++;
      } catch (error) {
        this.logger.error(`Error creating test case file ${testCase.id}:`, error);
        throw error;
      }
    }
    
    // Update the requirement counter
    this.requirementIdService.updateRequirementCounters({ [REQUIREMENT_TYPE.TC]: nextId - 1 });
  }

  /**
   * Fetches test case counts for a list of user stories
   * @param projectId The project ID
   * @param userStories Array of user stories
   * @returns A promise that resolves to a map of user story IDs to test case counts
   */
  async fetchTestCaseCounts(projectId: string, userStories: IUserStory[]): Promise<Map<string, number>> {
    const testCaseCounts = new Map<string, number>();
    
    for (const userStory of userStories) {
      const testCasePath = joinPaths(projectId, 'TC', userStory.id);
      
      try {
        const exists = await this.appSystemService.fileExists(testCasePath);
        
        if (exists) {
          const files = await this.appSystemService.getFolders(testCasePath, FILTER_STRINGS.BASE, false);
          testCaseCounts.set(userStory.id, files.length);
        } else {
          testCaseCounts.set(userStory.id, 0);
        }
      } catch (error) {
        this.logger.error(`Error checking test case directory for ${userStory.id}:`, error);
        testCaseCounts.set(userStory.id, 0);
      }
    }
    
    return testCaseCounts;
  }

  /**
   * Gets the test case count for a user story
   * @param testCaseCounts Map of user story IDs to test case counts
   * @param userStoryId The user story ID
   * @returns The test case count
   */
  getTestCaseCount(testCaseCounts: Map<string, number>, userStoryId: string): number {
    return testCaseCounts.get(userStoryId) || 0;
  }

  /**
   * Gets the total number of user stories
   * @param userStories Array of user stories
   * @returns The total number of user stories
   */
  getTotalUserStories(userStories: IUserStory[]): number {
    return userStories.length;
  }

  /**
   * Gets the number of user stories with test cases
   * @param userStories Array of user stories
   * @param testCaseCounts Map of user story IDs to test case counts
   * @returns The number of user stories with test cases
   */
  getUserStoriesWithTestCases(userStories: IUserStory[], testCaseCounts: Map<string, number>): number {
    let count = 0;
    userStories.forEach(story => {
      if (this.getTestCaseCount(testCaseCounts, story.id) > 0) {
        count++;
      }
    });
    return count;
  }

  /**
   * Gets the total number of test cases
   * @param userStories Array of user stories
   * @param testCaseCounts Map of user story IDs to test case counts
   * @returns The total number of test cases
   */
  getTotalTestCases(userStories: IUserStory[], testCaseCounts: Map<string, number>): number {
    let total = 0;
    userStories.forEach(story => {
      total += this.getTestCaseCount(testCaseCounts, story.id);
    });
    return total;
  }

  /**
   * Gets the border class for a user story based on its test case count
   * @param testCaseCounts Map of user story IDs to test case counts
   * @param userStoryId The user story ID
   * @returns The border class
   */
  getUserStoryBorderClass(testCaseCounts: Map<string, number>, userStoryId: string): string {
    const testCaseCount = this.getTestCaseCount(testCaseCounts, userStoryId);
    if (testCaseCount === 0) {
      return 'border-l-4 border-l-red-500';
    } else if (testCaseCount > 0) {
      return 'border-l-4 border-l-green-500';
    } else {
      return 'border-l-4 border-l-amber-500';
    }
  }

  /**
   * Gets the status indicator for a user story based on its test case count
   * @param testCaseCounts Map of user story IDs to test case counts
   * @param userStoryId The user story ID
   * @returns The status indicator
   */
  getUserStoryStatusIndicator(testCaseCounts: Map<string, number>, userStoryId: string): CardStatusIndicator {
    const testCaseCount = this.getTestCaseCount(testCaseCounts, userStoryId);
    let icon = '';
    let iconBgClass = '';
    let iconColorClass = '';
    let tooltip = '';
    
    if (testCaseCount === 0) {
      icon = 'heroExclamationCircle';
      iconBgClass = 'bg-red-100';
      iconColorClass = 'text-red-600';
      tooltip = 'No test cases created';
    } else {
      icon = 'heroClipboardDocumentCheck';
      iconBgClass = 'bg-green-100';
      iconColorClass = 'text-green-600';
      tooltip = `${testCaseCount} test cases created`;
    }
    
    return {
      icon,
      iconBgClass,
      iconColorClass,
      text: `${testCaseCount} test cases`,
      tooltip
    };
  }

  /**
   * Gets the border class for a test case based on its priority
   * @param testCase The test case
   * @returns The border class
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
   * Gets the status indicator for a test case based on its priority
   * @param testCase The test case
   * @returns The status indicator
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
   * Gets the badges for a test case
   * @param testCase The test case
   * @returns Array of badges
   */
  getTestCaseBadges(testCase: ITestCase): CardBadge[] {
    const badges: CardBadge[] = [];
    
    if (testCase.type) {
      badges.push({
        text: testCase.type,
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-700'
      });
    }
    
    if (testCase.steps?.length) {
      badges.push({
        text: `${testCase.steps.length} steps`,
        bgClass: 'bg-gray-50',
        textClass: 'text-gray-700'
      });
    }
    
    return badges;
  }
}
