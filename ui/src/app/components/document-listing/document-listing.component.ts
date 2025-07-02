import { Component, Input, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { BehaviorSubject, combineLatest, Observable, Subscription, first } from 'rxjs';
import { BulkReadFiles, ExportRequirementData, BulkUpdateFiles, GetProjectFiles, ReadFile } from '../../store/projects/projects.actions';
import { Ticket } from '../../services/pmo-integration/pmo-integration.service';
import { getDescriptionFromInput } from '../../utils/common.utils';
import { filter, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { IList, SelectedDocument } from '../../model/interfaces/IList';
import { RequirementTypeEnum } from '../../model/enum/requirement-type.enum';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { BadgeComponent } from '../core/badge/badge.component';
import { ButtonComponent } from '../core/button/button.component';
import { NgIconComponent } from '@ng-icons/core';
import { SearchInputComponent } from '../core/search-input/search-input.component';
import { SearchService } from '../../services/search/search.service';
import { APP_INFO_COMPONENT_ERROR_MESSAGES } from '../../constants/messages.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { FOLDER_REQUIREMENT_TYPE_MAP } from 'src/app/constants/app.constants';
import { EXPORT_FILE_FORMATS, ExportFileFormat } from 'src/app/constants/export.constants';
import { RichTextEditorComponent } from '../core/rich-text-editor/rich-text-editor.component';
import { processPRDContentForView } from '../../utils/prd.utils';
import { truncateMarkdown } from 'src/app/utils/markdown.utils';
import { DropdownOptionGroup, ExportDropdownComponent } from "../../export-dropdown/export-dropdown.component";
import { AdoIntegrationModalComponent } from '../ado-integration-modal/ado-integration-modal.component';

@Component({
  selector: 'app-document-listing',
  templateUrl: './document-listing.component.html',
  styleUrls: ['./document-listing.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    BadgeComponent,
    ButtonComponent,
    NgIconComponent,
    NgForOf,
    SearchInputComponent,
    MatMenuModule,
    RichTextEditorComponent,
    NgClass,
    ExportDropdownComponent
],
})
export class DocumentListingComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(SearchInputComponent) searchInput!: SearchInputComponent;

  loadingProjectFiles$ = this.store.select(ProjectsState.loadingProjectFiles);
  requirementTypes: any = RequirementTypeEnum;
  private searchTerm$ = new BehaviorSubject<string>('');

  appInfo: any = {};
  originalDocumentList$: Observable<IList[]> = this.store.select(ProjectsState.getSelectedFileContents);
  documentList$!: Observable<(IList & { id: string; formattedRequirement: string | null })[]>;
  filteredDocumentList$!: Observable<(IList & { id: string; formattedRequirement: string | null })[]>;
  selectedFolder: any = {};
  private combinedSubject = new BehaviorSubject<{ title: string; id: string }>({ title: '', id: '' });
  private subscription: Subscription = new Subscription();
  private scrollContainer: HTMLElement | null = null;
  @Input() set folder(value: { title: string; id: string; metadata: any }) {
    this.appInfo = value.metadata;
    this.selectedFolder = value;
    this.combinedSubject.next({ title: value.title, id: value.id });

    // Reset scroll position when a new folder is set
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = 0;
    }

    // Reset search input when a new folder is set
    if (this.searchInput) {
      this.searchInput.clearSearch();
    }
  }

  // For Export Dropdown Options
  exportOptions: DropdownOptionGroup[] = [];
  exportedFolderName: string = '';

  currentRoute: string;
  constructor(
    private store: Store, 
    private router: Router, 
    private searchService: SearchService, 
    private toast: ToasterService,
    private dialog: MatDialog) {
    this.currentRoute = this.router.url;
    this.documentList$ = combineLatest([
      this.originalDocumentList$,
      this.combinedSubject,
    ]).pipe(
      map(([documents, folder]) =>
        documents.map((doc) => ({
          ...doc,
          id: folder.id,
          formattedRequirement: this.formatRequirementForView(doc.content?.requirement, doc.folderName)
        })),
      ),
    );

    this.filteredDocumentList$ = this.searchService.filterItems(
      this.documentList$,
      this.searchTerm$,
      (doc) => [doc.fileName, doc.content?.title, doc.content?.epicTicketId],
    );
  }

  onSearch(term: string) {
    this.searchTerm$.next(term);
  }

  ngOnInit() {
    this.subscription.add(
      combineLatest([this.combinedSubject, this.loadingProjectFiles$])
        .pipe(
          filter(([folder, isLoading]) => !!folder && !isLoading),
          switchMap(([folder, _]) => {
            return this.store.dispatch(new BulkReadFiles(folder.title));
          }),
        )
        .subscribe(),
    );
  }

  ngAfterViewInit() {
    // Set up the scroll container reference to the correct element
    this.scrollContainer = document.querySelector('.doc-section-height');

    // Add scroll event listener to the scrollable container
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', () => {
        this.saveScrollPosition();
      });
    }

    // Restore scroll position if available
    this.restoreScrollPosition();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.saveScrollPosition();
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.saveScrollPosition.bind(this)); // Clean up event listener
    }
  }

  private saveScrollPosition() {
    if (this.scrollContainer) {
      const scrollY = this.scrollContainer.scrollTop;
      sessionStorage.setItem('scrollPosition', scrollY.toString());
    }
  }

  private restoreScrollPosition() {
    const savedScrollPosition = sessionStorage.getItem('scrollPosition');
    if (savedScrollPosition && this.scrollContainer) {
      this.scrollContainer.scrollTop = parseInt(savedScrollPosition, 10);
    }
  }

  navigateToEdit({ id, folderName, fileName, content }: any) {
    const url = folderName === this.requirementTypes.BP ? '/bp-edit' : '/edit';
    this.router.navigate([url], {
      state: { data: this.appInfo, id, folderName, fileName, req: content },
    });
  }

  navigateToUserStories(item: any) {
    this.router.navigate(['/user-stories', item.id], {
      state: {
        data: this.appInfo,
        id: item.id,
        folderName: item.folderName,
        fileName: item.fileName,
        req: item.content,
      },
    });
  }

  navigateToAdd(id: any, folderName: any) {
    if (folderName === this.requirementTypes.BP) {
      // Check if any non-archived PRD or BRD exists
      this.store.select(ProjectsState.getProjectsFolders).pipe(first()).subscribe(directories => {
        const prdDir = directories.find(dir => dir.name === 'PRD');
        const brdDir = directories.find(dir => dir.name === 'BRD');

        // For PRD, only check base files that aren't archived
        const hasPRD = prdDir && prdDir.children
          .filter(child => child.includes('-base.json'))
          .some(child => !child.includes('-archived'));

        // For BRD, only check base files that aren't archived
        const hasBRD = brdDir && brdDir.children
          .filter(child => child.includes('-base.json'))
          .some(child => !child.includes('-archived'));

        if (!hasPRD && !hasBRD) {
          this.toast.showWarning(APP_INFO_COMPONENT_ERROR_MESSAGES.REQUIRES_PRD_OR_BRD);
          return;
        }

        this.router.navigate(['/bp-add'], {
          state: {
            data: this.appInfo,
            id,
            folderName,
            breadcrumb: {
              name: 'Add Document',
              link: this.currentRoute,
              icon: 'add',
            },
          },
        });
      });
    } else {
      this.router.navigate(['/add'], {
        state: {
          data: this.appInfo,
          id,
          folderName,
          breadcrumb: {
            name: 'Add Document',
            link: this.currentRoute,
            icon: 'add',
          },
        },
      });
    }
  }

  navigateToBPFlow(item: any) {
    this.router.navigate(['/bp-flow/view', item.id], {
      state: {
        data: this.appInfo,
        id: item.id,
        folderName: item.folderName,
        fileName: item.fileName,
        req: {
          ...item.content,
          selectedBRDs:
            (item.content?.selectedBRDs ?? []).map(
              ({ requirement }: SelectedDocument) => requirement,
            ),
          selectedPRDs:
            (item.content?.selectedPRDs ?? []).map(
              ({ requirement }: SelectedDocument) => requirement,
            ),
        },
        selectedFolder: {
          title: item.folderName,
          id: this.appInfo.id,
          metadata: this.appInfo,
        },
      },
    });
  }

  exportDocumentList(folder: string, format: ExportFileFormat) {
    const requirementType = FOLDER_REQUIREMENT_TYPE_MAP[folder];

    this.store.dispatch(
      new ExportRequirementData(requirementType, {
        type: format,
      }),
    );
  }

  /**
   * Handle Pull from ADO action with integration status check
   */
  pullFromAdo(folderName: string) {
    this.openAdoIntegrationModal(folderName, 'pull');
  }

  /**
   * Handle Push to ADO action with integration status check
   */
  pushToAdo(folderName: string) {
    this.openAdoIntegrationModal(folderName, 'push');
  }

  /**
   * Opens the ADO integration status modal and handles the result
   */
  private openAdoIntegrationModal(folderName: string, action: 'pull' | 'push') {
    // Use the project ID from appInfo which is set from the folder metadata
    const projectId = this.appInfo?.id;
    
    if (!projectId) {
      this.toast.showError('No project selected');
      return;
    }

    const dialogRef = this.dialog.open(AdoIntegrationModalComponent, {
      width: '75%',
      maxHeight: '90vh',
      data: {
        projectId,
        folderName
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.proceed) {
        // ADO is connected, proceed with the action
        if (result?.selectedItems) {
          // If we have selected items, process them
          this.processAdoSelectedItems(folderName, action, result.selectedItems);
        } else {
          // Fall back to old behavior if no selected items
          this.executeAdoAction(folderName, action);
        }
      } else if (result?.configure) {
        // User wants to configure ADO integration
        this.navigateToAdoConfiguration();
      }
      // If no result or cancelled, do nothing
    });
  }

  /**
   * Execute the actual ADO action (pull or push)
   */
  private executeAdoAction(folderName: string, action: 'pull' | 'push') {
    // For now, we'll use the existing export functionality
    // TODO: Implement actual ADO pull/push logic
    this.exportDocumentList(folderName, EXPORT_FILE_FORMATS.JSON);
    
    const actionText = action === 'pull' ? 'Pulling from' : 'Pushing to';
    this.toast.showSuccess(`${actionText} ADO for ${folderName}`);
  }

  /**
   * Process selected ADO items and create/update PRD files
   * @param folderName The folder name 
   * @param action The action (pull or push)
   * @param selectedItems The items selected in the ADO integration modal
   */
  private processAdoSelectedItems(
    folderName: string, 
    action: 'pull' | 'push', 
    selectedItems: { 
      prds: Ticket[], 
      userStories: Ticket[], 
      tasks: Ticket[] 
    }
  ): void {
    console.log(`Processing ADO items for ${folderName} with action: ${action}`, selectedItems);
    console.log("Project metadata:", this.appInfo);
    if (action === 'pull') {
      try {
        // First, get the existing PRD files to check for pmoId and get max PRD number
        this.getExistingPrdFiles().then(existingData => {
          const { maxPrdNumber, existingPmoMap, existingFeatureFiles } = existingData;
          
          // Group tickets by parent relationship
          const ticketGroups = this.groupTicketsByParentRelationship(selectedItems);
          
          // Prepare updates array for BulkUpdateFiles action
          const updates: { path: string; content: any }[] = [];
          
          // Process each PRD (Feature from ADO)
          ticketGroups.forEach((group, index) => {
            const prd = group.prd;
            
            // Check if this PRD already exists based on pmoId
            const existingPrd = existingPmoMap.prds[prd.pmoId];
            
            // Determine PRD ID - use existing or generate new one with zero-padding (PRD01, PRD02, etc.)
            const prdId = existingPrd ? 
              existingPrd.specifaiId : 
              `PRD${String(maxPrdNumber + index + 1).padStart(2, '0')}`;
            
            // Format the user stories and tasks for this PRD
            const features = this.formatFeaturesForPrd(group.userStories, group.tasks, existingPmoMap);
            
            // Create the PRD base file content with correct structure
            const prdBaseContent = {
              id: prdId,
              title: prd.title,
              requirement: prd.description || '', // Map description to requirement field
              state: 'Active',
              createdAt: existingPrd ? new Date().toISOString() : new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              pmoId: prd.pmoId, // Store ADO ID for future reference
              pmoIssueType: prd.pmoIssueType,
              chatHistory: [] // Add empty chatHistory array as required
            };
            
            // Check if there's an existing feature file for this PRD
            const featureFilePath = `prd/${prdId}-feature.json`;
            const existingFeatureFile = existingFeatureFiles[prdId];
            
            let prdFeatureContent: any = { features: features };
            
            // If this PRD exists and we have the feature file content, merge with new features
            if (existingPrd && existingFeatureFile) {
              const existingFeatures = existingFeatureFile.features || [];
              
              // Create a map of existing features by pmoId for easy lookup
              const existingFeatureMap = new Map<string, any>();
              existingFeatures.forEach((feature: any) => {
                if (feature.pmoId) {
                  existingFeatureMap.set(feature.pmoId, feature);
                }
              });
              
              // Merge or update features
              const mergedFeatures = features.map(newFeature => {
                const existingFeature = existingFeatureMap.get(newFeature.pmoId);
                
                // If this feature already exists, update its properties but preserve any
                // that might be set in the UI and not coming from ADO
                if (existingFeature) {
                  existingFeatureMap.delete(newFeature.pmoId); // Remove from map to track what's processed
                  
                  // Create a map of existing tasks by pmoId
                  const existingTaskMap = new Map<string, any>();
                  (existingFeature.tasks || []).forEach((task: any) => {
                    if (task.pmoId) {
                      existingTaskMap.set(task.pmoId, task);
                    }
                  });
                  
                  // Merge tasks within this feature
                  const mergedTasks = (newFeature.tasks || []).map((newTask: any) => {
                    const existingTask = existingTaskMap.get(newTask.pmoId);
                    
                    // If task exists, update it
                    if (existingTask) {
                      existingTaskMap.delete(newTask.pmoId); // Remove from map to track what's processed
                      return {
                        ...existingTask,
                        list: newTask.list,
                        acceptance: newTask.acceptance || existingTask.acceptance,
                        // Keep other properties from existing task
                      };
                    }
                    
                    // This is a new task
                    return newTask;
                  });
                  
                  // Add any remaining existing tasks that weren't in the new data
                  existingTaskMap.forEach(remainingTask => {
                    mergedTasks.push(remainingTask);
                  });
                  
                  // Return the merged feature
                  return {
                    ...existingFeature,
                    name: newFeature.name,
                    description: newFeature.description || existingFeature.description,
                    tasks: mergedTasks,
                    // Keep other properties from existing feature
                  };
                }
                
                // This is a new feature
                return newFeature;
              });
              
              // Add any remaining existing features that weren't in the new data
              existingFeatureMap.forEach(remainingFeature => {
                mergedFeatures.push(remainingFeature);
              });
              
              // Update the feature content with merged features
              prdFeatureContent = { 
                ...existingFeatureFile, 
                features: mergedFeatures 
              };
            }
            
            // Log what we're saving for debugging
            console.log(`Creating/updating PRD base file: ${prdId}-base.json`, prdBaseContent);
            console.log(`Creating/updating PRD feature file: ${prdId}-feature.json`, prdFeatureContent);
            
            // Add PRD files to updates
            updates.push({
              path: `prd/${prdId}-base.json`,
              content: prdBaseContent
            });
            
            updates.push({
              path: featureFilePath,
              content: prdFeatureContent
            });
          });
          
          // If we have updates, dispatch the BulkUpdateFiles action
          if (updates.length > 0) {
            // Calculate the new max PRD number after adding all new PRDs
            const newMaxPrdNumber = maxPrdNumber + ticketGroups.filter(group => {
              const prd = group.prd;
              return !existingPmoMap.prds[prd.pmoId]; // Only count new PRDs
            }).length;
            
            // Update the metadata with the new PRD count
            this.updatePrdCountInMetadata(newMaxPrdNumber);
            
            this.store.dispatch(new BulkUpdateFiles(updates));
            this.toast.showSuccess(`Successfully imported ${ticketGroups.length} PRDs with their user stories and tasks from ADO`);
            
            // Refresh the file list
            const projectId = this.appInfo?.id;
            if (projectId) {
              this.store.dispatch(new GetProjectFiles(projectId));
            }
          } else {
            this.toast.showInfo('No items to import from ADO');
          }
        }).catch(error => {
          console.error('Error processing ADO items:', error);
          this.toast.showError('Failed to process ADO items');
        });
      } catch (error) {
        console.error('Error importing items from ADO:', error);
        this.toast.showError('Failed to import items from ADO');
      }
    } else {
      // For 'push' action (not implemented yet)
      this.toast.showInfo('Push to ADO functionality is not yet implemented');
    }
  }

  /**
   * Navigate to ADO configuration page or open settings
   */
  private navigateToAdoConfiguration() {
    // Create the state object to pass with navigation
    const navState = { 
      data: this.appInfo,
      selectedFolder: {
        title: 'app-integrations',
        id: this.appInfo?.id,
        metadata: this.appInfo
      },
      selectedIntegration: 'ado',
      openPmoAccordion: true 
    };
    
    // Check if we're already on the apps/{id} page
    const currentUrl = this.router.url;
    const targetUrl = `/apps/${this.appInfo?.id}`;
    
    if (currentUrl === targetUrl) {
      const event = new CustomEvent('open-pmo-integration', { detail: navState });
      window.dispatchEvent(event);
    } else {
      this.router.navigate([targetUrl], { state: navState });
    }
  }

  getDescription(input: string | undefined): string | null {
    return getDescriptionFromInput(input);
  }

  private formatRequirementForView(requirement: string | undefined, folderName: string): string | null {
    if (!requirement) return null;
    
    const requirementType = FOLDER_REQUIREMENT_TYPE_MAP[folderName];

    if (requirementType === this.requirementTypes.PRD) {
      return processPRDContentForView(requirement, 150); // 150 chars per section
    }

    return truncateMarkdown(requirement, {
      maxChars: 180,
      ellipsis: true,
    });
  }

  getExportOptions(folderName: string) {
    if (!folderName) {
      console.warn('Folder name is undefined');
      return [];
    }

    if (this.exportedFolderName === folderName) {
      return this.exportOptions;
    }
        
    const exportJson = () => {
      this.exportDocumentList(folderName, EXPORT_FILE_FORMATS.JSON);
    };

    const exportExcel = () => {
      this.exportDocumentList(folderName, EXPORT_FILE_FORMATS.EXCEL);
    };

    const pullFromAdo = () => {
      this.pullFromAdo(folderName);
    };

    const pushToAdo = () => {
      this.pushToAdo(folderName);
    };

    this.exportedFolderName = folderName;
    this.exportOptions = [
      {
        groupName: 'Export',
        options: [
          {
            label: 'Copy to Clipboard',
            callback: exportJson.bind(this),
            icon: 'heroPaperClip',
            additionalInfo: "JSON Format",
            isTimestamp: false,
          },
          {
            label: 'Download',
            callback: exportExcel.bind(this),
            icon: 'heroDocumentText',
            additionalInfo: "Excel (.xlsx)",
            isTimestamp: false,
          }
        ]
      },
      {
        groupName: 'ADO',
        options: [
          {
            label: 'Pull from ADO',
            callback: pullFromAdo.bind(this),
            icon: 'heroArrowDownTray',
            // additionalInfo: this.requirementFile?.lastPushToJiraTimestamp || undefined,
            isTimestamp: true
          },
          {
            label: 'Push to ADO',
            callback: pushToAdo.bind(this),
            icon: 'heroArrowUpTray',
            // additionalInfo: this.requirementFile?.lastPushToJiraTimestamp || undefined,
            isTimestamp: true,
          }
        ]
      }
    ];
    return this.exportOptions;
  }

  /**
   * Fetch existing PRD files and analyze them to find max PRD number and existing pmoIds
   * @returns Promise with information about existing PRD files
   */
  private getExistingPrdFiles(): Promise<{
    maxPrdNumber: number;
    existingPmoMap: {
      prds: { [pmoId: string]: { specifaiId: string; path: string } };
      userStories: { [pmoId: string]: { specifaiId: string; path: string } };
      tasks: { [pmoId: string]: { specifaiId: string; path: string } };
    };
    existingFeatureFiles: { [prdId: string]: any };
  }> {
    return new Promise((resolve, reject) => {
      // Get all PRD files from the project
      this.store.select(ProjectsState.getProjectsFolders).pipe(first()).subscribe(
        directories => {
          try {
            // Find the PRD directory
            const prdDir = directories.find(dir => dir.name === 'prd');
            
            if (!prdDir || !prdDir.children || prdDir.children.length === 0) {
              // No PRD files exist yet
              resolve({
                maxPrdNumber: 0,
                existingPmoMap: { prds: {}, userStories: {}, tasks: {} },
                existingFeatureFiles: {}
              });
              return;
            }
            
            // Get all feature files (PRD*-feature.json)
            const featureFiles = prdDir.children.filter(file => 
              file.includes('-feature.json') && !file.includes('-archived')
            );
            
            // Get all base files (PRD*-base.json)
            const baseFiles = prdDir.children.filter(file => 
              file.includes('-base.json') && !file.includes('-archived')
            );
            
            // Find max PRD number - use the regex to match PRD with any number format
            let maxPrdNumber = 0;
            const prdRegex = /PRD(\d+)[-]/;

            console.log("Project metadata for PRD count:", this.appInfo);
            
            // Check if we have project metadata with prdCount
            if (this.appInfo && this.appInfo.prdCount) {
              // Use the value from metadata.json
              maxPrdNumber = parseInt(this.appInfo.prdCount, 10);
            } else {
              // Fall back to scanning file names
              baseFiles.forEach(file => {
                const match = file.match(prdRegex);
                if (match && match[1]) {
                  // Handle both PRD1 and PRD01 formats by stripping leading zeros
                  const prdNumber = parseInt(match[1], 10);
                  if (prdNumber > maxPrdNumber) {
                    maxPrdNumber = prdNumber;
                  }
                }
              });
            }
            
            // Initialize mapping objects for existing items with pmoId
            const existingPmoMap = {
              prds: {} as { [pmoId: string]: { specifaiId: string; path: string } },
              userStories: {} as { [pmoId: string]: { specifaiId: string; path: string } },
              tasks: {} as { [pmoId: string]: { specifaiId: string; path: string } }
            };
            
            // Object to store existing feature files content
            const existingFeatureFiles: { [prdId: string]: any } = {};
            
            // Process base files to find PRDs with pmoId
            const baseFilePromises = baseFiles.map(file => {
              return new Promise<void>((resolveFile) => {
                // Extract PRD ID from filename
                const prdMatch = file.match(prdRegex);
                if (!prdMatch || !prdMatch[1]) {
                  resolveFile();
                  return;
                }
                
                // Ensure consistent format with zero-padding (PRD01, PRD02, etc.)
                const prdNumber = parseInt(prdMatch[1], 10);
                const prdId = `PRD${String(prdNumber).padStart(2, '0')}`;
                
                // Read the base file to check for pmoId
                this.store.dispatch(new ReadFile(`prd/${file}`))
                  .pipe(first())
                  .subscribe({
                    next: () => {
                      // Get the file content from state
                      this.store.select(ProjectsState.getSelectedFileContent)
                        .pipe(first())
                        .subscribe(content => {
                          // Check for pmoId in both formats (old and new structure)
                          if (content && content.pmoId) {
                            // Store mapping of pmoId to specifaiId for PRDs
                            existingPmoMap.prds[content.pmoId] = {
                              specifaiId: prdId,
                              path: `prd/${file}`
                            };
                          }
                          resolveFile();
                        });
                    },
                    error: () => {
                      // Ignore errors and continue
                      resolveFile();
                    }
                  });
              });
            });
            
            // Process feature files to find user stories and tasks with pmoId
            const featureFilePromises = featureFiles.map(file => {
              return new Promise<void>((resolveFile) => {
                // Extract PRD ID from filename
                const prdMatch = file.match(prdRegex);
                if (!prdMatch || !prdMatch[1]) {
                  resolveFile();
                  return;
                }
                
                // Ensure consistent format with zero-padding (PRD01, PRD02, etc.)
                const prdNumber = parseInt(prdMatch[1], 10);
                const prdId = `PRD${String(prdNumber).padStart(2, '0')}`;
                
                // Read the feature file to check for user stories and tasks with pmoId
                this.store.dispatch(new ReadFile(`prd/${file}`))
                  .pipe(first())
                  .subscribe({
                    next: () => {
                      // Get the file content from state
                      this.store.select(ProjectsState.getSelectedFileContent)
                        .pipe(first())
                        .subscribe(content => {
                          // Store the feature file content
                          existingFeatureFiles[prdId] = content;
                          
                          // Process features (user stories) and their tasks
                          if (content && content.features && Array.isArray(content.features)) {
                            content.features.forEach((feature: any) => {
                              if (feature.pmoId) {
                                // Store mapping of pmoId to specifaiId for user stories
                                existingPmoMap.userStories[feature.pmoId] = {
                                  specifaiId: feature.id,
                                  path: `prd/${file}`
                                };
                              }
                              
                              // Process tasks
                              if (feature.tasks && Array.isArray(feature.tasks)) {
                                feature.tasks.forEach((task: any) => {
                                  if (task.pmoId) {
                                    // Store mapping of pmoId to specifaiId for tasks
                                    existingPmoMap.tasks[task.pmoId] = {
                                      specifaiId: task.id,
                                      path: `prd/${file}`
                                    };
                                  }
                                });
                              }
                            });
                          }
                          resolveFile();
                        });
                    },
                    error: () => {
                      // Ignore errors and continue
                      resolveFile();
                    }
                  });
              });
            });
            
            // Wait for all file reading to complete
            Promise.all([...baseFilePromises, ...featureFilePromises]).then(() => {
              resolve({
                maxPrdNumber,
                existingPmoMap,
                existingFeatureFiles
              });
            }).catch(error => {
              reject(error);
            });
          } catch (error) {
            reject(error);
          }
        },
        error => reject(error)
      );
    });
  }
  
  /**
   * Update the PRD count in the project metadata if needed
   * @param newPrdCount The new PRD count
   */
  private updatePrdCountInMetadata(newPrdCount: number): void {
    // Only update if we have appInfo and the new count is higher than the current one
    if (this.appInfo) {
      const currentCount = this.appInfo.prdCount ? parseInt(this.appInfo.prdCount, 10) : 0;
      
      if (newPrdCount > currentCount) {
        // Create a copy of the metadata to update
        const updatedMetadata = { 
          ...this.appInfo, 
          prdCount: String(newPrdCount) 
        };
        
        // We should update the metadata in the project, but this would require
        // invoking the electron service to update the .metadata.json file
        // For now, just update our local copy
        this.appInfo = updatedMetadata;
        
        // Ideally we would save this back to the file system, but that would require
        // implementing a method to update the .metadata.json file
        // TODO: Implement updating metadata file
      }
    }
  }
  
  /**
   * Group tickets by their parent-child relationships
   * @param selectedItems Selected tickets from ADO
   * @returns Array of ticket groups, each containing a PRD and its related user stories and tasks
   */
  private groupTicketsByParentRelationship(selectedItems: {
    prds: Ticket[];
    userStories: Ticket[];
    tasks: Ticket[];
  }): Array<{
    prd: Ticket;
    userStories: Ticket[];
    tasks: { [userStoryId: string]: Ticket[] };
  }> {
    const ticketGroups: Array<{
      prd: Ticket;
      userStories: Ticket[];
      tasks: { [userStoryId: string]: Ticket[] };
    }> = [];
    
    // Process each PRD
    selectedItems.prds.forEach(prd => {
      // Find user stories for this PRD
      const relatedUserStories = selectedItems.userStories.filter(
        us => us.pmoParentId === prd.pmoId
      );
      
      // Create task map for this PRD
      const taskMap: { [userStoryId: string]: Ticket[] } = {};
      
      // Process each user story to find related tasks
      relatedUserStories.forEach(userStory => {
        // Find tasks for this user story
        const relatedTasks = selectedItems.tasks.filter(
          task => task.pmoParentId === userStory.pmoId
        );
        
        if (relatedTasks.length > 0) {
          taskMap[userStory.pmoId] = relatedTasks;
        }
      });
      
      // Add this PRD group
      ticketGroups.push({
        prd,
        userStories: relatedUserStories,
        tasks: taskMap
      });
    });
    
    return ticketGroups;
  }
  
  /**
   * Format user stories and tasks into the features format required for PRD feature files
   * @param userStories User stories to include in the PRD
   * @param tasks Tasks mapped by user story ID
   * @param existingPmoMap Map of existing items with pmoId
   * @returns Array of formatted features
   */
  private formatFeaturesForPrd(
    userStories: Ticket[], 
    tasks: { [userStoryId: string]: Ticket[] },
    existingPmoMap: {
      prds: { [pmoId: string]: { specifaiId: string; path: string } };
      userStories: { [pmoId: string]: { specifaiId: string; path: string } };
      tasks: { [pmoId: string]: { specifaiId: string; path: string } };
    }
  ): Array<any> {
    let nextUserStoryId = 1;
    let nextTaskId = 1;
    
    // Find the highest existing US and TASK IDs
    Object.values(existingPmoMap.userStories).forEach(item => {
      const match = item.specifaiId.match(/US(\d+)/);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        if (id >= nextUserStoryId) {
          nextUserStoryId = id + 1;
        }
      }
    });
    
    Object.values(existingPmoMap.tasks).forEach(item => {
      const match = item.specifaiId.match(/TASK(\d+)/);
      if (match && match[1]) {
        const id = parseInt(match[1], 10);
        if (id >= nextTaskId) {
          nextTaskId = id + 1;
        }
      }
    });
    
    // Format user stories into features
    return userStories.map(userStory => {
      // Determine user story ID - use existing or generate new one
      const userStoryId = existingPmoMap.userStories[userStory.pmoId] ?
        existingPmoMap.userStories[userStory.pmoId].specifaiId :
        `US${nextUserStoryId++}`;
      
      // Get tasks for this user story
      const userStoryTasks = tasks[userStory.pmoId] || [];
      
      // Format tasks
      const formattedTasks = userStoryTasks.map(task => {
        // Determine task ID - use existing or generate new one
        const taskId = existingPmoMap.tasks[task.pmoId] ?
          existingPmoMap.tasks[task.pmoId].specifaiId :
          `TASK${nextTaskId++}`;
        
        return {
          id: taskId,
          list: task.title,
          acceptance: task.description || '',
          status: 'Active',
          pmoId: task.pmoId // Store ADO ID for future reference
        };
      });
      
      // Return the feature object (user story)
      return {
        id: userStoryId,
        name: userStory.title,
        description: userStory.description || '',
        pmoId: userStory.pmoId, // Store ADO ID for future reference
        tasks: formattedTasks
      };
    });
  }
}
