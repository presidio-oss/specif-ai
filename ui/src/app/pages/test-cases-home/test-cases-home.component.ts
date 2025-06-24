import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { GetProjectFiles, BulkReadFiles } from '../../store/projects/projects.actions';
import { UserStoriesState } from '../../store/user-stories/user-stories.state';
import { SetSelectedUserStory } from '../../store/user-stories/user-stories.actions';
import { IUserStory } from '../../model/interfaces/IUserStory';
import { ClipboardService } from '../../services/clipboard.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { ButtonComponent } from '../../components/core/button/button.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowRight } from '@ng-icons/heroicons/outline';
import { ListItemComponent } from '../../components/core/list-item/list-item.component';
import { BadgeComponent } from '../../components/core/badge/badge.component';
import { FILTER_STRINGS, TOASTER_MESSAGES } from '../../constants/app.constants';
import { SearchInputComponent } from '../../components/core/search-input/search-input.component';
import { AppSelectComponent, SelectOption } from '../../components/core/app-select/app-select.component';
import { SearchService } from '../../services/search/search.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { AddBreadcrumb, DeleteBreadcrumb } from '../../store/breadcrumb/breadcrumb.actions';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { ElectronService } from '../../electron-bridge/electron.service';

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
    ButtonComponent,
    MatMenuModule,
    AsyncPipe,
    NgIf,
    NgForOf,
    ListItemComponent,
    BadgeComponent,
    SearchInputComponent,
    MatTooltipModule,
    AppSelectComponent,
  ],
  providers: [
    provideIcons({
      heroArrowRight,
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
  
  // Observable for user stories
  userStories$ = new BehaviorSubject<IUserStory[]>([]);
  
  // Observable for filtered user stories
  filteredUserStories$ = this.searchService.filterItems(
    this.userStories$,
    this.searchTerm$,
    (story: IUserStory) => [story.id, story.name],
  );
  
  // PRD information
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
    // Add breadcrumb for test cases home
    this.store.dispatch(
      new AddBreadcrumb({
        label: 'Test Cases',
        tooltipLabel: 'Test Cases Home',
      }),
    );
  }
  
  ngOnInit() {
    console.log('TestCasesHomeComponent initialized');
    // Get projectId from query parameters
    this.route.queryParams.subscribe((params: { [key: string]: string }) => {
      if (params['projectId']) {
        this.currentProject = params['projectId'];
        console.log(`Project ID from query params: ${this.currentProject}`);
        this.logger.debug(`Project ID from query params: ${this.currentProject}`);
        
        // Dispatch GetProjectFiles action to load project folders with base files
        this.store.dispatch(new GetProjectFiles(this.currentProject, FILTER_STRINGS.BASE)).subscribe(() => {
          console.log('GetProjectFiles action with BASE filter completed');
          this.loadPrdList();
        });
      } else {
        // Fallback to selected project from store if no query param
        this.selectedProject$.subscribe((project) => {
          this.currentProject = project;
          console.log('Selected project from store:', project);
          this.logger.debug(project, 'selected project');
          
          if (project) {
            // Dispatch GetProjectFiles action to load project folders with base files
            this.store.dispatch(new GetProjectFiles(this.currentProject, FILTER_STRINGS.BASE)).subscribe(() => {
              console.log('GetProjectFiles action with BASE filter completed');
              this.loadPrdList();
            });
          }
        });
      }
    });
  }
  
  onSearch(term: string) {
    this.searchTerm$.next(term);
  }
  
  navigateToTestCases(userStory: IUserStory) {
    this.logger.debug('Navigating to test cases for user story:', userStory);
    
    // Store the user story ID in the NgXs store
    this.store.dispatch(new SetSelectedUserStory(userStory.id));
    
    // Navigate to the test-cases component with the user story ID
    this.router.navigate(['/test-cases', userStory.id], {
      queryParams: {
        projectId: this.currentProject
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
  
  /**
   * Loads the list of PRDs from base files
   */
  private loadPrdList() {
    this.isLoading = true;
    console.log('Loading PRD list');
    this.logger.debug('Loading PRD list');
    
    // Use BulkReadFiles to load all PRD base files
    this.store.dispatch(new BulkReadFiles('PRD'));
    
    // Subscribe to the file contents
    this.originalDocumentList$.subscribe(documents => {
      if (!documents || documents.length === 0) {
        console.log('No PRD documents found');
        this.isLoading = false;
        this.prdList$.next([]);
        return;
      }
      
      // Filter for base files and exclude archived files
      const baseDocuments = documents.filter(doc => 
        doc.fileName.includes('-base.json') && !doc.fileName.includes('-archived')
      );
      
      console.log('Base documents:', baseDocuments);
      
      if (baseDocuments.length === 0) {
        console.log('No non-archived base documents found');
        this.isLoading = false;
        this.prdList$.next([]);
        return;
      }
      
      console.log(`Found ${baseDocuments.length} non-archived base documents`);
      this.logger.debug(`Found ${baseDocuments.length} non-archived base documents`);
      
      // Process each base document to get PRD information
      const allPrds: IPrdInfo[] = [];
      
      baseDocuments.forEach(doc => {
        // Extract the full PRD ID (e.g., "PRD01") from the filename
        const prdId = doc.fileName.split('-base.json')[0];
        const content = doc.content;
        
        if (content) {
          // Create PRD info object
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
  
  /**
   * Helper method to finish loading PRD list
   */
  private finishLoadingPrds(prds: IPrdInfo[]) {
    console.log(`Loaded ${prds.length} PRDs:`, prds);
    this.logger.debug(`Loaded ${prds.length} PRDs`);
    
    // Sort PRDs by ID
    prds.sort((a, b) => a.id.localeCompare(b.id));
    
    this.prdList = prds;
    this.prdList$.next(prds);
    this.isLoading = false;
    
    // If there are PRDs, select the first one by default
    if (prds.length > 0) {
      this.selectPrd(prds[0].id);
    }
  }
  
  /**
   * Convert PRD list to SelectOption array for app-select component
   */
  getPrdSelectOptions(): SelectOption[] {
    return this.prdList.map(prd => ({
      value: prd.id,
      label: `${prd.id} - ${prd.name}`
    }));
  }
  
  /**
   * Select a PRD and load its user stories
   */
  selectPrd(prdId: string) {
    console.log(`Selecting PRD: ${prdId}`);
    this.logger.debug(`Selecting PRD: ${prdId}`);
    
    // Update selected state in PRD list
    this.prdList = this.prdList.map(prd => ({
      ...prd,
      selected: prd.id === prdId
    }));
    this.prdList$.next(this.prdList);
    
    this.selectedPrdId = prdId;
    
    // Set the selected PRD title
    const selectedPrd = this.prdList.find(prd => prd.id === prdId);
    if (selectedPrd) {
      this.selectedPrdTitle = selectedPrd.name;
    }
    
    // Load user stories for the selected PRD
    this.loadUserStoriesForPrd(prdId);
  }
  
  /**
   * Loads user stories for a specific PRD from its feature file
   */
  private loadUserStoriesForPrd(prdId: string) {
    this.isLoading = true;
    console.log(`Loading user stories for PRD: ${prdId}`);
    this.logger.debug(`Loading user stories for PRD: ${prdId}`);
    
    const featureFile = `${prdId}-feature.json`;
    const featurePath = `${this.currentProject}/PRD/${featureFile}`;
    
    console.log(`Reading feature file: ${featurePath}`);
    
    // First check if the file exists
    this.appSystemService.fileExists(featurePath)
      .then(exists => {
        if (!exists) {
          console.log(`File ${featurePath} does not exist`);
          this.finishLoading([]);
          return;
        }
        
        // Read the file content using AppSystemService
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
  
  /**
   * Helper method to finish loading user stories
   */
  private finishLoading(userStories: IUserStory[]) {
    console.log(`Loaded ${userStories.length} user stories:`, userStories);
    this.logger.debug(`Loaded ${userStories.length} user stories`);
    this.userStories = userStories;
    this.userStories$.next(userStories);
    this.isLoading = false;
  }
  
  ngOnDestroy() {
    // Remove the breadcrumb when the component is destroyed
    this.store.dispatch(new DeleteBreadcrumb('Test Cases'));
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}
