import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../../store/projects/projects.state';
import { GetProjectFiles, BulkReadFiles, ClearBRDPRDState } from '../../../store/projects/projects.actions';
import { GetUserStories, SetSelectedUserStory } from '../../../store/user-stories/user-stories.actions';
import { IUserStory } from '../../../model/interfaces/IUserStory';
import { ClipboardService } from '../../../services/clipboard.service';
import { ToasterService } from '../../../services/toaster/toaster.service';
import { TestCaseService } from '../../../services/test-case/test-case.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { provideIcons } from '@ng-icons/core';
import { heroArrowRight, heroDocumentText, heroClipboardDocumentCheck, heroBeaker } from '@ng-icons/heroicons/outline';
import { UnifiedCardComponent, CardStatusIndicator } from '../../../components/unified-card/unified-card.component';
import { BadgeComponent } from '../../../components/core/badge/badge.component';
import { FILTER_STRINGS, TOASTER_MESSAGES } from '../../../constants/app.constants';
import { SearchInputComponent } from '../../../components/core/search-input/search-input.component';
import { AppSelectComponent, SelectOption } from '../../../components/core/app-select/app-select.component';
import { SearchService } from '../../../services/search/search.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { AddBreadcrumb, DeleteBreadcrumb } from '../../../store/breadcrumb/breadcrumb.actions';
import { AppSystemService } from '../../../services/app-system/app-system.service';
import { SummaryCardComponent } from "../../../components/summary-card/summary-card.component";
import { FormsModule } from '@angular/forms';

interface IPrdInfo {
  id: string;
  name: string;
  description?: string;
  selected?: boolean;
}

@Component({
  selector: 'app-test-cases-home',
  templateUrl: './test-case-home.component.html',
  styleUrls: ['./test-case-home.component.scss'],
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
export class TestCaseHomeComponent implements OnInit, OnDestroy {
  currentProject!: string;
  private searchTerm$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();
  router = inject(Router);
  logger = inject(NGXLogger);
  store = inject(Store);
  searchService = inject(SearchService);
  testCaseService = inject(TestCaseService);
  
  userStories: IUserStory[] = [];
  isLoading: boolean = false;
  testCaseCounts: Map<string, number> = new Map<string, number>();
  
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
    this.clearAllData();
    
    this.store.dispatch(
      new AddBreadcrumb({
        label: 'Test Cases',
        tooltipLabel: 'Test Cases Home',
      }),
    );
    
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params: { [key: string]: string }) => {
      if (params['projectName']) {
        this.currentProject = params['projectName'];
        
        this.clearAllData();
        
        this.store.dispatch(new GetProjectFiles(this.currentProject, FILTER_STRINGS.BASE)).subscribe(() => {
          this.loadPrdList();
        });
      } else {
        this.selectedProject$.pipe(takeUntil(this.destroy$)).subscribe((project) => {
          if (this.currentProject !== project) {
            this.currentProject = project;
            this.logger.debug(project, 'selected project');
            
            this.clearAllData();
            
            if (project) {
              this.store.dispatch(new GetProjectFiles(this.currentProject, FILTER_STRINGS.BASE)).subscribe(() => {
                this.loadPrdList();
              });
            }
          }
        });
      }
    });
  }
  
  private clearAllData() {
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
    
    const prdId = userStory.prdId || '';
    let prdTitle = '';
    let prdDescription = '';
    
    if (prdId && this.prdList && this.prdList.length > 0) {
      const selectedPrd = this.prdList.find(prd => prd.id === prdId);
      if (selectedPrd) {
        prdTitle = selectedPrd.name || '';
        prdDescription = selectedPrd.description || '';
      }
    }
    
    this.router.navigate(['/test-cases', userStory.id], {
      queryParams: {
        projectName: this.currentProject,
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
    return this.testCaseService.getUserStoryBorderClass(this.testCaseCounts, userStoryId);
  }
  
  /**
   * Returns the status indicator for a user story
   */
  getUserStoryStatusIndicator(userStoryId: string): CardStatusIndicator {
    return this.testCaseService.getUserStoryStatusIndicator(this.testCaseCounts, userStoryId);
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
        this.isLoading = false;
        return;
      }
      
      const baseDocuments = documents.filter(doc => 
        doc.fileName.includes('-base.json') && !doc.fileName.includes('-archived')
      );
      
      if (baseDocuments.length === 0) {
        this.isLoading = false;
        return;
      }
      
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
        }
      });
      
      this.finishLoadingPrds(allPrds);
    });
  }
  
  private finishLoadingPrds(prds: IPrdInfo[]) {
    this.logger.debug(`Loaded ${prds.length} PRDs`);
    
    prds.sort((a, b) => a.id.localeCompare(b.id));
    
    this.prdList = prds;
    this.prdList$.next(prds);
    this.isLoading = false;
    
    if (prds.length > 0) {
      const savedPrdId = this.testCaseService.getSelectedPrdId(this.currentProject);
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
    
    this.testCaseService.setSelectedPrdId(this.currentProject, prdId);
    
    this.loadUserStoriesForPrd(prdId);
  }
  
  private loadUserStoriesForPrd(prdId: string) {
    this.isLoading = true;
    this.logger.debug(`Loading user stories for PRD: ${prdId}`);
    
    const featureFile = `${prdId}-feature.json`;
    const featurePath = `${this.currentProject}/PRD/${featureFile}`;
    
    this.store.dispatch(new GetUserStories(featurePath));
    
    this.appSystemService.fileExists(featurePath)
      .then(exists => {
        if (!exists) {
          this.finishLoading([]);
          return;
        }
        
        this.appSystemService.readFile(featurePath)
          .then(content => {
            if (!content) {
              this.finishLoading([]);
              return;
            }
            
            try {
              const parsedContent = JSON.parse(content);
              
              if (parsedContent && parsedContent.features && Array.isArray(parsedContent.features)) {
                const userStories = parsedContent.features.map((feature: any) => ({
                  id: feature.id,
                  name: feature.name,
                  description: feature.description || '',
                  prdId: prdId,
                }));
                
                this.finishLoading(userStories);
              } else {
                this.finishLoading([]);
              }
            } catch (error) {
              this.logger.error(`Error parsing feature file ${featureFile}:`, error);
              this.finishLoading([]);
            }
          })
          .catch(error => {
            this.logger.error(`Error reading feature file ${featureFile}:`, error);
            this.finishLoading([]);
          });
      })
      .catch(error => {
        this.logger.error(`Error checking if file exists ${featurePath}:`, error);
        this.finishLoading([]);
      });
  }
  
  private finishLoading(userStories: IUserStory[]) {
    this.logger.debug(`Loaded ${userStories.length} user stories`);
    this.userStories = userStories;
    this.userStories$.next(userStories);
    
    if (userStories.length > 0) {
      this.fetchTestCaseCounts(userStories);
    } else {
      this.isLoading = false;
    }
  }
  
  private async fetchTestCaseCounts(userStories: IUserStory[]) {
    this.logger.debug('Fetching test case counts for user stories');
    this.testCaseCounts = await this.testCaseService.fetchTestCaseCounts(this.currentProject, userStories);
    this.isLoading = false;
  }
  
  getTestCaseCount(userStoryId: string): number {
    return this.testCaseService.getTestCaseCount(this.testCaseCounts, userStoryId);
  }
  
  getTotalUserStories(): number {
    return this.testCaseService.getTotalUserStories(this.userStories);
  }

  getUserStoriesWithTestCases(): number {
    return this.testCaseService.getUserStoriesWithTestCases(this.userStories, this.testCaseCounts);
  }

  getTotalTestCases(): number {
    return this.testCaseService.getTotalTestCases(this.userStories, this.testCaseCounts);
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
