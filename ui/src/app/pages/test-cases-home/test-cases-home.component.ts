import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { GetProjectFiles, BulkReadFiles, ClearBRDPRDState } from '../../store/projects/projects.actions';
import { GetUserStories, SetSelectedUserStory } from '../../store/user-stories/user-stories.actions';
import { IUserStory } from '../../model/interfaces/IUserStory';
import { ClipboardService } from '../../services/clipboard.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { provideIcons } from '@ng-icons/core';
import { heroArrowRight, heroDocumentText, heroClipboardDocumentCheck, heroBeaker } from '@ng-icons/heroicons/outline';
import { UnifiedCardComponent, CardStatusIndicator } from '../../components/unified-card/unified-card.component';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import { FILTER_STRINGS, TOASTER_MESSAGES } from '../../constants/app.constants';
import { SearchInputComponent } from '../../components/core/search-input/search-input.component';
import { AppSelectComponent, SelectOption } from '../../components/core/app-select/app-select.component';
import { SearchService } from '../../services/search/search.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { AddBreadcrumb, DeleteBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { SummaryCardComponent } from "../../components/summary-card/summary-card.component";
import { FormsModule } from '@angular/forms';

// Interface for PRD information
interface IPrdInfo {
  id: string;
  name: string;
  description?: string;
  selected?: boolean;
}

@Component({
  selector: 'app-test-cases-home',
  templateUrl: './test-cases-home.component.html',
  styleUrls: ['./test-cases-home.component.scss'],
  standalone: true,
  imports: [
    MatMenuModule,
    AsyncPipe,
    NgIf,
    NgForOf,
    UnifiedCardComponent,
    SummaryCardComponent,
    BadgeComponent,
    SearchInputComponent,
    MatTooltipModule,
    AppSelectComponent,
    FormsModule
],
  providers: [
    provideIcons({
      heroArrowRight,
      heroDocumentText,
      heroClipboardDocumentCheck,
      heroBeaker
    }),
  ],
})
export class TestCasesHomeComponent implements OnInit, OnDestroy {
  currentProject!: string;
  private searchTerm$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();
  router = inject(Router);
  logger = inject(NGXLogger);
  store = inject(Store);
  searchService = inject(SearchService);
  
  userStories: IUserStory[] = [];
  isLoading: boolean = false;
  testCaseCounts: Map<string, number> = new Map<string, number>();
  private readonly SELECTED_PRD_KEY = 'selectedPrdId';
  
  summaryCards: SummaryCardData[] = [
    {
      icon: 'heroDocumentText',
      title: 'Total User Stories',
      color: 'primary',
      countFn: () => this.getTotalUserStories()
    },
    {
      icon: 'heroClipboardDocumentCheck',
      title: 'Stories with Test Cases',
      color: 'warning',
      countFn: () => this.getUserStoriesWithTestCases(),
    },
    {
      icon: 'heroBeaker',
      title: 'Total Test Cases',
      color: 'success',
      countFn: () => this.getTotalTestCases()
    }
  ];
  
  userStories$ = new BehaviorSubject<IUserStory[]>([]);
  
  filteredUserStories$ = this.searchService.filterItems(
    this.userStories$,
    this.searchTerm$,
    (story: IUserStory) => [story.id, story.name],
  );
  
  prdList: IPrdInfo[] = [];
  prdList$ = new BehaviorSubject<IPrdInfo[]>([]);
  selectedPrdId: string | null = null;
  selectedPrdTitle: string = '';
  
  selectedProject$ = this.store.select(ProjectsState.getSelectedProject);
  originalDocumentList$ = this.store.select(ProjectsState.getSelectedFileContents);
  
  constructor(
    private clipboardService: ClipboardService,
    private toast: ToasterService,
    private appSystemService: AppSystemService,
    private route: ActivatedRoute,
  ) {
  }
  
  ngOnInit() {
    console.debug('TestCasesHomeComponent initialized');
    
    this.clearAllData();
    
    this.store.dispatch(
      new AddBreadcrumb({
        label: 'Test Cases',
        tooltipLabel: 'Test Cases Home',
      }),
    );
    
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params: { [key: string]: string }) => {
      if (params['projectId']) {
        this.currentProject = params['projectId'];
        console.debug(`Project ID from query params: ${this.currentProject}`);
        
        this.clearAllData();
        
        this.store.dispatch(new GetProjectFiles(this.currentProject, FILTER_STRINGS.BASE)).subscribe(() => {
          console.log('GetProjectFiles action with BASE filter completed');
          this.loadPrdList();
        });
      } else {
        this.selectedProject$.pipe(takeUntil(this.destroy$)).subscribe((project) => {
          if (this.currentProject !== project) {
            this.currentProject = project;
            console.log('Selected project from store:', project);
            this.logger.debug(project, 'selected project');
            
            this.clearAllData();
            
            if (project) {
              this.store.dispatch(new GetProjectFiles(this.currentProject, FILTER_STRINGS.BASE)).subscribe(() => {
                console.log('GetProjectFiles action with BASE filter completed');
                this.loadPrdList();
              });
            }
          }
        });
      }
    });
  }
  
  private clearAllData() {
    console.debug('Clearing all PRD and user story data');
    this.store.dispatch(new ClearBRDPRDState());

    this.prdList = [];
    this.prdList$.next([]);
    this.selectedPrdId = null;
    this.selectedPrdTitle = '';
    this.userStories = [];
    this.userStories$.next([]);
    this.testCaseCounts = new Map<string, number>();
  }
  
  onSearch(term: string) {
    this.searchTerm$.next(term);
  }
  
  navigateToTestCases(userStory: IUserStory) {
    this.logger.debug('Navigating to test cases for user story:', userStory);
    
    this.store.dispatch(new SetSelectedUserStory(userStory.id));
    
    // Get PRD information if available
    const prdId = userStory.prdId || '';
    let prdTitle = '';
    let prdDescription = '';
    
    // Find the selected PRD in our list
    if (prdId && this.prdList && this.prdList.length > 0) {
      const selectedPrd = this.prdList.find(prd => prd.id === prdId);
      if (selectedPrd) {
        prdTitle = selectedPrd.name || '';
        prdDescription = selectedPrd.description || '';
        console.debug(`Including PRD information in navigation: ${prdId} - ${prdTitle} - ${prdDescription}`);
      }
    }
    
    this.router.navigate(['/test-cases', userStory.id], {
      queryParams: {
        projectId: this.currentProject,
        prdId: prdId,
        prdTitle: prdTitle ? encodeURIComponent(prdTitle) : '',
        prdDescription: prdDescription ? encodeURIComponent(prdDescription) : ''
      }
    });
  }
  
  copyUserStoryContent(event: Event, userStory: IUserStory) {
    event.stopPropagation();
    const userStoryContent = `${userStory.id}: ${userStory.name}\n${userStory.description || ''}`;
    const success = this.clipboardService.copyToClipboard(userStoryContent);
    if (success) {
      this.toast.showSuccess(
        TOASTER_MESSAGES.ENTITY.COPY.SUCCESS('US', userStory.id),
      );
    } else {
      this.toast.showError(
        TOASTER_MESSAGES.ENTITY.COPY.FAILURE('US', userStory.id),
      );
    }
  }
  
  getUserStoryBorderClass(userStoryId: string): string {
    const testCaseCount = this.getTestCaseCount(userStoryId);
    if (testCaseCount === 0) {
      return 'border-l-4 border-l-red-500';
    } else if (testCaseCount > 0) {
      return 'border-l-4 border-l-green-500';
    } else {
      return 'border-l-4 border-l-amber-500';
    }
  }
  
  /**
   * Returns the status indicator for a user story
   */
  getUserStoryStatusIndicator(userStoryId: string): CardStatusIndicator {
    const testCaseCount = this.getTestCaseCount(userStoryId);
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
  
  private loadPrdList() {
    this.isLoading = true;
    this.logger.debug('Loading PRD list');
    
    this.prdList = [];
    this.prdList$.next([]);
    this.selectedPrdId = null;
    this.selectedPrdTitle = '';
    
    this.store.dispatch(new BulkReadFiles('PRD'));
    
    this.originalDocumentList$.pipe(takeUntil(this.destroy$)).subscribe(documents => {
      if (!documents || documents.length === 0) {
        console.debug('No PRD documents found');
        this.isLoading = false;
        return;
      }
      
      const baseDocuments = documents.filter(doc => 
        doc.fileName.includes('-base.json') && !doc.fileName.includes('-archived')
      );
      
      console.log('Base documents:', baseDocuments);
      
      if (baseDocuments.length === 0) {
        console.log('No non-archived base documents found');
        this.isLoading = false;
        return;
      }
      
      console.log(`Found ${baseDocuments.length} non-archived base documents`);
      this.logger.debug(`Found ${baseDocuments.length} non-archived base documents`);
      
      const allPrds: IPrdInfo[] = [];
      
      baseDocuments.forEach(doc => {
        const prdId = doc.fileName.split('-base.json')[0];
        const content = doc.content;
        
        if (content) {
          const prdInfo: IPrdInfo = {
            id: prdId,
            name: content.title || `PRD ${prdId.replace('PRD', '')}`,
            description: content.requirement || '',
            selected: false
          };
          
          allPrds.push(prdInfo);
          console.log(`Added PRD info: ${prdInfo.id} - ${prdInfo.name}`);
        }
      });
      
      this.finishLoadingPrds(allPrds);
    });
  }
  
  private finishLoadingPrds(prds: IPrdInfo[]) {
    console.log(`Loaded ${prds.length} PRDs:`, prds);
    this.logger.debug(`Loaded ${prds.length} PRDs`);
    
    prds.sort((a, b) => a.id.localeCompare(b.id));
    
    this.prdList = prds;
    this.prdList$.next(prds);
    this.isLoading = false;
    
    if (prds.length > 0) {
      const savedPrdId = sessionStorage.getItem(`${this.SELECTED_PRD_KEY}_${this.currentProject}`);
      if (savedPrdId && prds.some(prd => prd.id === savedPrdId)) {
        this.selectPrd(savedPrdId);
      } else {
        this.selectPrd(prds[0].id);
      }
    }
  }
  
  getPrdSelectOptions(): SelectOption[] {
    return this.prdList.map(prd => ({
      value: prd.id,
      label: `${prd.id} - ${prd.name}`
    }));
  }

  selectPrd(prdId: string) {
    console.debug(`Selecting PRD: ${prdId}`);
    this.logger.debug(`Selecting PRD: ${prdId}`);
    
    this.prdList = this.prdList.map(prd => ({
      ...prd,
      selected: prd.id === prdId
    }));
    this.prdList$.next(this.prdList);
    
    this.selectedPrdId = prdId;
    
    const selectedPrd = this.prdList.find(prd => prd.id === prdId);
    if (selectedPrd) {
      this.selectedPrdTitle = selectedPrd.name;
    }
    
    // Save the selected PRD ID to session storage
    sessionStorage.setItem(`${this.SELECTED_PRD_KEY}_${this.currentProject}`, prdId);
    
    this.loadUserStoriesForPrd(prdId);
  }
  
  private loadUserStoriesForPrd(prdId: string) {
    this.isLoading = true;
    console.log(`Loading user stories for PRD: ${prdId}`);
    this.logger.debug(`Loading user stories for PRD: ${prdId}`);
    
    const featureFile = `${prdId}-feature.json`;
    const featurePath = `${this.currentProject}/PRD/${featureFile}`;
    
    console.log(`Reading feature file: ${featurePath}`);
    this.store.dispatch(new GetUserStories(featurePath));
    
    this.appSystemService.fileExists(featurePath)
      .then(exists => {
        if (!exists) {
          console.log(`File ${featurePath} does not exist`);
          this.finishLoading([]);
          return;
        }
        
        this.appSystemService.readFile(featurePath)
          .then(content => {
            console.log(`File content for ${featureFile}:`, content ? 'Content received' : 'No content');
            
            if (!content) {
              console.log(`Empty content for ${featureFile}`);
              this.finishLoading([]);
              return;
            }
            
            try {
              const parsedContent = JSON.parse(content);
              console.log(`Parsed content for ${featureFile}:`, parsedContent);
              
              if (parsedContent && parsedContent.features && Array.isArray(parsedContent.features)) {
                console.log(`Features array found in ${featureFile}:`, parsedContent.features);
                
                const userStories = parsedContent.features.map((feature: any) => ({
                  id: feature.id,
                  name: feature.name,
                  description: feature.description || '',
                  prdId: prdId,
                }));
                
                console.log(`Mapped user stories from ${featureFile}:`, userStories);
                this.finishLoading(userStories);
              } else {
                console.log(`No features array found in ${featureFile} or it's not an array`);
                this.finishLoading([]);
              }
            } catch (error) {
              console.error(`Error parsing feature file ${featureFile}:`, error);
              this.logger.error(`Error parsing feature file ${featureFile}:`, error);
              this.finishLoading([]);
            }
          })
          .catch(error => {
            console.error(`Error reading feature file ${featureFile}:`, error);
            this.logger.error(`Error reading feature file ${featureFile}:`, error);
            this.finishLoading([]);
          });
      })
      .catch(error => {
        console.error(`Error checking if file exists ${featurePath}:`, error);
        this.logger.error(`Error checking if file exists ${featurePath}:`, error);
        this.finishLoading([]);
      });
  }
  
  private finishLoading(userStories: IUserStory[]) {
    console.log(`Loaded ${userStories.length} user stories:`, userStories);
    this.logger.debug(`Loaded ${userStories.length} user stories`);
    this.userStories = userStories;
    this.userStories$.next(userStories);
    
    if (userStories.length > 0) {
      this.fetchTestCaseCounts(userStories);
    } else {
      this.isLoading = false;
    }
  }
  
  private fetchTestCaseCounts(userStories: IUserStory[]) {
    console.log('Fetching test case counts for user stories');
    this.logger.debug('Fetching test case counts for user stories');
    
    this.testCaseCounts = new Map<string, number>();
    let processedCount = 0;
    
    userStories.forEach(userStory => {
      const testCasePath = `${this.currentProject}/TC/${userStory.id}`;
      
      this.appSystemService.fileExists(testCasePath)
        .then(exists => {
          if (exists) {
            this.appSystemService.getFolders(testCasePath, FILTER_STRINGS.BASE, false)
              .then(files => {
                this.testCaseCounts.set(userStory.id, files.length);
                console.log(`User story ${userStory.id} has ${files.length} test cases`);
                
                processedCount++;
                
                if (processedCount === userStories.length) {
                  this.isLoading = false;
                }
              })
              .catch(error => {
                console.error(`Error getting test case files for ${userStory.id}:`, error);
                this.testCaseCounts.set(userStory.id, 0);
                processedCount++;
                
                if (processedCount === userStories.length) {
                  this.isLoading = false;
                }
              });
          } else {
            this.testCaseCounts.set(userStory.id, 0);
            console.log(`User story ${userStory.id} has no test cases`);
            
            processedCount++;
            
            if (processedCount === userStories.length) {
              this.isLoading = false;
            }
          }
        })
        .catch(error => {
          console.error(`Error checking test case directory for ${userStory.id}:`, error);
          this.testCaseCounts.set(userStory.id, 0);
          
          processedCount++;
          if (processedCount === userStories.length) {
            this.isLoading = false;
          }
        });
    });
  }
  
  getTestCaseCount(userStoryId: string): number {
    return this.testCaseCounts.get(userStoryId) || 0;
  }
  
  getTotalUserStories(): number {
    return this.userStories.length;
  }

  getUserStoriesWithTestCases(): number {
    let count = 0;
    this.userStories.forEach(story => {
      if (this.getTestCaseCount(story.id) > 0) {
        count++;
      }
    });
    return count;
  }

  getTotalTestCases(): number {
    let total = 0;
    this.userStories.forEach(story => {
      total += this.getTestCaseCount(story.id);
    });
    return total;
  }
  
  ngOnDestroy() {
    this.store.dispatch(new DeleteBreadcrumb('Test Cases'));
    this.destroy$.next();
    this.destroy$.complete();
  }
}

interface SummaryCardData {
  icon: string;
  title: string;
  color?: string;
  countFn: () => number;
}
