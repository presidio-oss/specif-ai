import { Component, Inject, OnInit, signal, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { ToasterService } from '../../services/toaster/toaster.service';
import { ButtonComponent } from '../core/button/button.component';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroXMark,
  heroEllipsisHorizontal,
  heroCheckCircle,
  heroXCircle,
  heroExclamationTriangle,
  heroChevronDown,
  heroChevronRight,
  heroArrowPath,
  heroDocumentPlus,
  heroDocumentCheck,
  heroCog6Tooth,
  heroInbox,
} from '@ng-icons/heroicons/outline';
import { APP_MESSAGES } from 'src/app/constants/app.constants';
import { Ticket } from '../../services/pmo-integration/pmo-integration.service';
import {
  PmoService,
  PmoConnectionStatus,
} from '../../services/pmo-integration/pmo-service.interface';
import { PmoServiceFactory } from '../../services/pmo-integration/pmo-service.factory';
import {
  PMO_MODAL_CONFIGS,
  PmoModalConfig,
} from '../../config/pmo-modal.config';

interface PmoIntegrationData {
  projectId: string;
  folderName: string;
  pmoType: 'ado' | 'jira';
  action?: 'pull' | 'push';
}

@Component({
  selector: 'app-pmo-integration-modal',
  templateUrl: './pmo-integration-modal.component.html',
  styleUrls: ['./pmo-integration-modal.component.scss'],
  standalone: true,
  imports: [NgIf, NgClass, NgFor, ButtonComponent, NgIcon],
  providers: [
    provideIcons({
      heroXMark,
      heroEllipsisHorizontal,
      heroCheckCircle,
      heroXCircle,
      heroExclamationTriangle,
      heroChevronDown,
      heroChevronRight,
      heroArrowPath,
      heroDocumentPlus,
      heroDocumentCheck,
      heroCog6Tooth,
      heroInbox,
    }),
  ],
})
export class PmoIntegrationModalComponent implements OnInit {
  isLoading = signal<boolean>(true);
  isLoadingWorkItems = signal<boolean>(false);
  connectionStatus = signal<PmoConnectionStatus>({
    isConnected: false,
  });

  // Current action (pull or push)
  action = signal<'pull' | 'push'>('pull');

  prdsWithChildren = signal<Ticket[]>([]);
  expandedPrdIds = signal<Set<string>>(new Set());
  expandedUserStoryIds = signal<Set<string>>(new Set());

  currentPage = signal<number>(0);
  pageSize = signal<number>(200);
  totalItems = signal<number>(0);
  hasMoreItems = signal<boolean>(false);
  isLoadingMore = signal<boolean>(false);

  // Selected items
  selectedPrdIds = signal<Set<string>>(new Set());
  selectedUserStoryIds = signal<Set<string>>(new Set());
  selectedTaskIds = signal<Set<string>>(new Set());

  // Select all state
  allItemsSelected = signal<boolean>(false);

  selectedCount = computed(
    () =>
      this.selectedPrdIds().size +
      this.selectedUserStoryIds().size +
      this.selectedTaskIds().size,
  );

  // PMO service and configuration
  private pmoService: PmoService;
  public config: PmoModalConfig;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PmoIntegrationData,
    private dialogRef: MatDialogRef<PmoIntegrationModalComponent>,
    private toasterService: ToasterService,
    private pmoServiceFactory: PmoServiceFactory,
  ) {
    this.pmoService = this.pmoServiceFactory.getPmoService(this.data.pmoType);
    this.config = PMO_MODAL_CONFIGS[this.data.pmoType];
    this.action.set(this.data.action || 'pull');

    if (!this.config) {
      throw new Error(`Unsupported PMO type: ${this.data.pmoType}`);
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.pmoService.configure();
      const validationResult = await this.pmoService.validateCredentials();

      this.connectionStatus.set({
        isConnected: validationResult.isValid,
        errorMessage: validationResult.isValid
          ? undefined
          : validationResult.errorMessage ||
            this.getInvalidCredentialsMessage(),
      });

      if (validationResult.isValid) {
        this.isLoading.set(false);

        // Load appropriate data based on action
        if (this.action() === 'pull') {
          await this.loadPrdsHierarchy();
        } else {
          await this.loadCurrentDocumentHierarchy();
        }
      }
    } catch (error) {
      this.connectionStatus.set({
        isConnected: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Connection test failed. Please try again.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load the current document hierarchy from SpecifAI for push action
   */
  async loadCurrentDocumentHierarchy(): Promise<void> {
    try {
      this.isLoadingWorkItems.set(true);

      if (this.pmoService.getCurrentDocumentHierarchy) {
        const documentHierarchy =
          await this.pmoService.getCurrentDocumentHierarchy(
            this.data.folderName,
          );
        console.log('Loaded current document hierarchy:', documentHierarchy);
        this.prdsWithChildren.set(documentHierarchy);

        // Expand all PRDs and user stories by default
        this.expandAllItemsByDefault(documentHierarchy);
      } else {
        this.toasterService.showError(
          `This PMO service doesn't support pushing documents to ${this.data.pmoType.toUpperCase()}`,
        );
      }
    } catch (error) {
      console.error(`Error loading current document hierarchy:`, error);
      this.toasterService.showError(
        `Failed to load current document hierarchy`,
      );
    } finally {
      this.isLoadingWorkItems.set(false);
    }
  }

  async loadPrdsHierarchy(reset: boolean = true): Promise<void> {
    try {
      if (reset) {
        this.isLoadingWorkItems.set(true);
      }
      
      const skip = this.currentPage() * this.pageSize();
      const { tickets: prdsHierarchy, totalCount } =
        await this.pmoService.getWorkPlanItemsHierarchy(skip, this.pageSize());

      if (reset) {
        this.currentPage.set(0);
        this.prdsWithChildren.set([]);
        this.totalItems.set(totalCount);
      }

      if (reset) {
        this.prdsWithChildren.set(prdsHierarchy);
      } else {
        const currentPrds = this.prdsWithChildren();
        this.prdsWithChildren.set([...currentPrds, ...prdsHierarchy]);
      }

      const actualLoadedCount = this.prdsWithChildren().length;
      const loadedExactPageSize = prdsHierarchy.length === this.pageSize();
      this.hasMoreItems.set(
        actualLoadedCount < this.totalItems() && loadedExactPageSize,
      );

      // Expand all PRDs and user stories by default
      this.expandAllItemsByDefault(prdsHierarchy);
    } catch (error) {
      console.error(
        `Error loading ${this.data.pmoType.toUpperCase()} work items:`,
        error,
      );
      this.toasterService.showError(
        `Failed to load ${this.data.pmoType.toUpperCase()} work items`,
      );
    } finally {
      if (reset) {
        this.isLoadingWorkItems.set(false);
      }
    }
  }

  async loadMoreItems(): Promise<void> {
    if (this.isLoadingMore() || !this.hasMoreItems()) {
      return;
    }

    try {
      this.isLoadingMore.set(true);
      this.currentPage.set(this.currentPage() + 1);
      await this.loadPrdsHierarchy(false);
    } catch (error) {
      console.error('Error loading more items:', error);
      this.toasterService.showError('Failed to load more items');
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  private expandAllItemsByDefault(prdsHierarchy: Ticket[]): void {
    // Get current expanded state
    const currentPrdIds = new Set(this.expandedPrdIds());
    const currentUserStoryIds = new Set(this.expandedUserStoryIds());

    // Only expand PRDs and user stories that have children
    prdsHierarchy.forEach((prd) => {
      if (prd.child && prd.child.length > 0) {
        currentPrdIds.add(prd.specifaiId);
        prd.child.forEach((userStory: Ticket) => {
          if (userStory.child && userStory.child.length > 0) {
            currentUserStoryIds.add(userStory.specifaiId);
          }
        });
      }
    });

    this.expandedPrdIds.set(currentPrdIds);
    this.expandedUserStoryIds.set(currentUserStoryIds);
  }

  togglePrdExpansion(prdId: string): void {
    const currentExpanded = this.expandedPrdIds();
    const newExpanded = new Set(currentExpanded);

    if (newExpanded.has(prdId)) {
      newExpanded.delete(prdId);
    } else {
      newExpanded.add(prdId);
    }

    this.expandedPrdIds.set(newExpanded);
  }

  toggleUserStoryExpansion(userStoryId: string): void {
    const currentExpanded = this.expandedUserStoryIds();
    const newExpanded = new Set(currentExpanded);

    if (newExpanded.has(userStoryId)) {
      newExpanded.delete(userStoryId);
    } else {
      newExpanded.add(userStoryId);
    }

    this.expandedUserStoryIds.set(newExpanded);
  }

  isPrdExpanded(prdId: string): boolean {
    return this.expandedPrdIds().has(prdId);
  }

  isUserStoryExpanded(userStoryId: string): boolean {
    return this.expandedUserStoryIds().has(userStoryId);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onProceed(): void {
    const status = this.connectionStatus();
    if (status.isConnected) {
      try {
        // Get all selected features (PRDs), platform features (User Stories), and user stories (Tasks)
        const selectedItems = this.getSelectedTickets();

        console.log('Selected items to proceed with:', selectedItems);

        if (Object.values(selectedItems).every((array) => array.length === 0)) {
          this.toasterService.showWarning(
            'No items selected. Please select at least one item to import.',
          );
          return;
        }

        // Let the dialog caller know we have data to save
        this.dialogRef.close({
          proceed: true,
          action: this.action(), // Use the current action (pull or push)
          folderName: this.data.folderName,
          selectedItems,
          pmoType: this.data.pmoType,
        });
      } catch (error) {
        console.error('Error processing selected items:', error);
        this.toasterService.showError('Failed to process selected items');
      }
    } else {
      this.toasterService.showError(
        `Please configure ${this.data.pmoType.toUpperCase()} integration before proceeding`,
      );
    }
  }

  /**
   * Collects all selected tickets grouped by their type and maps them to the appropriate format
   */
  private getSelectedTickets(): {
    prds: Ticket[];
    userStories: Ticket[];
    tasks: Ticket[];
  } {
    const prds = this.prdsWithChildren();

    // Containers for selected items
    const prdTickets: Ticket[] = [];
    const userStoryTickets: Ticket[] = [];
    const taskTickets: Ticket[] = [];

    // Loop through all PRDs
    prds.forEach((prd: Ticket) => {
      // If this PRD is selected, add it to PRDs
      if (this.isPrdSelected(prd.specifaiId)) {
        // Create a copy of the PRD with mapped properties
        const prdTicket: Ticket = {
          pmoId: prd.pmoId,
          pmoIssueType: prd.pmoIssueType,
          pmoParentId: prd.pmoParentId,
          specifaiId: prd.specifaiId,
          reqId: prd.specifaiId,
          specifaiType: 'PRD', // Explicitly set to PRD
          specifaiParentId: null,
          title: prd.title,
          description: prd.description,
          child: [], // We'll handle the relationships separately
        };

        prdTickets.push(prdTicket);

        // Process User Stories if they exist
        if (prd.child && prd.child.length > 0) {
          prd.child.forEach((userStory: Ticket) => {
            // If this user story is selected, add it to User Stories
            if (this.isUserStorySelected(userStory.specifaiId)) {
              // Create a copy of the user story with mapped properties
              const userStoryTicket: Ticket = {
                pmoId: userStory.pmoId,
                pmoIssueType: userStory.pmoIssueType,
                pmoParentId: userStory.pmoParentId,
                specifaiId: userStory.specifaiId,
                reqId: userStory.specifaiId,
                specifaiType: 'User Story', // Map to User Story
                specifaiParentId: prdTicket.specifaiId, // Link to parent PRD
                title: userStory.title,
                description: userStory.description,
                child: [], // We'll handle the relationships separately
              };

              userStoryTickets.push(userStoryTicket);

              // Process Tasks if they exist
              if (userStory.child && userStory.child.length > 0) {
                userStory.child.forEach((task: Ticket) => {
                  // If this task is selected, add it to Tasks
                  if (this.isTaskSelected(task.specifaiId)) {
                    // Create a copy of the task with mapped properties
                    const taskTicket: Ticket = {
                      pmoId: task.pmoId,
                      pmoIssueType: task.pmoIssueType,
                      pmoParentId: task.pmoParentId,
                      specifaiId: task.specifaiId,
                      reqId: task.specifaiId,
                      specifaiType: 'Task', // Map to Task
                      specifaiParentId: userStory.specifaiId, // Link to parent User Story
                      title: task.title,
                      description: task.description,
                      child: [], // No children for tasks
                    };

                    taskTickets.push(taskTicket);
                  }
                });
              }
            }
          });
        }
      }
    });

    return {
      prds: prdTickets,
      userStories: userStoryTickets,
      tasks: taskTickets,
    };
  }

  onConfigureIntegration(): void {
    this.dialogRef.close({ configure: true, pmoType: this.data.pmoType });
  }

  // Checkbox handling methods

  toggleSelectAllItems(event: Event): void {
    // Stop the click event from propagating to parent elements
    event.stopPropagation();

    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;

    this.allItemsSelected.set(isChecked);

    const prds = this.prdsWithChildren();

    // New sets for selected items
    const prdIds = new Set<string>();
    const userStoryIds = new Set<string>();
    const taskIds = new Set<string>();

    if (isChecked) {
      // Add all items to their respective sets
      prds.forEach((prd: Ticket) => {
        prdIds.add(prd.specifaiId);

        if (prd.child && prd.child.length > 0) {
          prd.child.forEach((userStory: Ticket) => {
            userStoryIds.add(userStory.specifaiId);

            if (userStory.child && userStory.child.length > 0) {
              userStory.child.forEach((task: Ticket) => {
                taskIds.add(task.specifaiId);
              });
            }
          });
        }
      });
    }

    // Update all selection sets
    this.selectedPrdIds.set(prdIds);
    this.selectedUserStoryIds.set(userStoryIds);
    this.selectedTaskIds.set(taskIds);
  }

  togglePrdSelection(event: Event, prdId: string): void {
    // Stop the click event from propagating to parent elements
    event.stopPropagation();

    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;

    const currentSelected = this.selectedPrdIds();
    const newSelected = new Set(currentSelected);

    // Toggle the PRD selection
    if (isChecked) {
      newSelected.add(prdId);
    } else {
      newSelected.delete(prdId);
    }

    this.selectedPrdIds.set(newSelected);

    // Handle cascading selection to children
    this.cascadePrdSelection(prdId, isChecked);

    // Update the "all selected" state
    this.updateAllSelectedState();
  }

  /**
   * Cascade PRD selection to all its user stories and tasks
   */
  private cascadePrdSelection(prdId: string, isSelected: boolean): void {
    const prds = this.prdsWithChildren();
    const prd = prds.find((p: Ticket) => p.specifaiId === prdId);

    if (!prd || !prd.child) {
      return;
    }

    // Get current selections to modify
    const userStoryIds = new Set(this.selectedUserStoryIds());
    const taskIds = new Set(this.selectedTaskIds());

    // Loop through all children and apply selection
    prd.child.forEach((userStory: Ticket) => {
      const usId = userStory.specifaiId;
      if (isSelected) {
        userStoryIds.add(usId);
      } else {
        userStoryIds.delete(usId);
      }

      if (userStory.child && userStory.child.length > 0) {
        userStory.child.forEach((task: Ticket) => {
          const taskId = task.specifaiId;
          if (isSelected) {
            taskIds.add(taskId);
          } else {
            taskIds.delete(taskId);
          }
        });
      }
    });

    // Update the selection sets
    this.selectedUserStoryIds.set(userStoryIds);
    this.selectedTaskIds.set(taskIds);
  }

  toggleUserStorySelection(event: Event, userStoryId: string): void {
    // Stop the click event from propagating to parent elements
    event.stopPropagation();

    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;

    const currentSelected = this.selectedUserStoryIds();
    const newSelected = new Set(currentSelected);

    // Toggle the user story selection
    if (isChecked) {
      newSelected.add(userStoryId);

      // If selected, also select parent PRD
      this.selectParentPrd(userStoryId);
    } else {
      newSelected.delete(userStoryId);
    }

    this.selectedUserStoryIds.set(newSelected);

    // Handle cascading selection to children tasks
    // Always cascade selection/deselection to children
    this.cascadeUserStorySelection(userStoryId, isChecked);

    // Update the "all selected" state
    this.updateAllSelectedState();
  }

  /**
   * Find and select the parent PRD of a user story
   */
  private selectParentPrd(userStoryId: string): void {
    const prds = this.prdsWithChildren();
    let parentPrd: Ticket | null = null;

    // Find the user story's parent PRD
    for (const prd of prds) {
      if (!prd.child) continue;

      const hasUserStory = prd.child.some(
        (us: Ticket) => us.specifaiId === userStoryId,
      );
      if (hasUserStory) {
        parentPrd = prd;
        break;
      }
    }

    if (parentPrd) {
      // Select the parent PRD
      const prdIds = new Set(this.selectedPrdIds());
      prdIds.add(parentPrd.specifaiId);
      this.selectedPrdIds.set(prdIds);
    }
  }

  /**
   * Cascade user story selection to all its tasks
   */
  private cascadeUserStorySelection(
    userStoryId: string,
    isSelected: boolean,
  ): void {
    // Find the user story in the hierarchy
    let foundUserStory: Ticket | undefined;

    const prds = this.prdsWithChildren();
    for (const prd of prds) {
      if (!prd.child) continue;

      const us = prd.child.find((us: Ticket) => us.specifaiId === userStoryId);
      if (us) {
        foundUserStory = us;
        break;
      }
    }

    if (!foundUserStory || !foundUserStory.child) {
      return;
    }

    // Get current selections to modify
    const taskIds = new Set(this.selectedTaskIds());

    // Apply selection to all tasks
    foundUserStory.child.forEach((task: Ticket) => {
      if (isSelected) {
        taskIds.add(task.specifaiId);
      } else {
        taskIds.delete(task.specifaiId);
      }
    });

    // Update the selection set
    this.selectedTaskIds.set(taskIds);
  }

  toggleTaskSelection(event: Event, taskId: string): void {
    // Stop the click event from propagating to parent elements
    event.stopPropagation();

    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;

    const currentSelected = this.selectedTaskIds();
    const newSelected = new Set(currentSelected);

    // Toggle the task selection
    if (isChecked) {
      newSelected.add(taskId);

      // If selected, select all parents in hierarchy (user story and PRD)
      this.selectParentHierarchyForTask(taskId);
    } else {
      newSelected.delete(taskId);
    }

    this.selectedTaskIds.set(newSelected);

    // Update the "all selected" state
    this.updateAllSelectedState();
  }

  /**
   * Automatically selects the entire parent hierarchy of a task
   * (both user story and PRD)
   */
  private selectParentHierarchyForTask(taskId: string): void {
    const prds = this.prdsWithChildren();
    let foundUserStory: Ticket | undefined = undefined;
    let foundPrd: Ticket | undefined = undefined;

    // Find the task's parent user story and grandparent PRD
    for (const prd of prds) {
      if (!prd.child) continue;

      for (const userStory of prd.child) {
        if (!userStory.child) continue;

        const foundTask = userStory.child.find(
          (t: Ticket) => t.specifaiId === taskId,
        );
        if (foundTask) {
          foundUserStory = userStory;
          foundPrd = prd;
          break;
        }
      }
      if (foundUserStory) break;
    }

    if (foundUserStory && foundPrd) {
      // Select the user story
      const userStoryIds = new Set(this.selectedUserStoryIds());
      userStoryIds.add(foundUserStory.specifaiId);
      this.selectedUserStoryIds.set(userStoryIds);

      // Select the PRD
      const prdIds = new Set(this.selectedPrdIds());
      prdIds.add(foundPrd.specifaiId);
      this.selectedPrdIds.set(prdIds);
    }
  }

  isPrdSelected(prdId: string): boolean {
    return this.selectedPrdIds().has(prdId);
  }

  isUserStorySelected(userStoryId: string): boolean {
    return this.selectedUserStoryIds().has(userStoryId);
  }

  isTaskSelected(taskId: string): boolean {
    return this.selectedTaskIds().has(taskId);
  }

  private updateAllSelectedState(): void {
    // Count all items
    let totalItemCount = 0;
    let selectedItemCount = 0;

    const prds = this.prdsWithChildren();
    prds.forEach((prd: Ticket) => {
      totalItemCount++; // Count the PRD
      if (this.isPrdSelected(prd.specifaiId)) {
        selectedItemCount++;
      }

      if (prd.child && prd.child.length > 0) {
        prd.child.forEach((userStory: Ticket) => {
          totalItemCount++; // Count the user story
          if (this.isUserStorySelected(userStory.specifaiId)) {
            selectedItemCount++;
          }

          if (userStory.child && userStory.child.length > 0) {
            userStory.child.forEach((task: Ticket) => {
              totalItemCount++; // Count the task
              if (this.isTaskSelected(task.specifaiId)) {
                selectedItemCount++;
              }
            });
          }
        });
      }
    });

    // Update all selected state
    this.allItemsSelected.set(
      totalItemCount > 0 && selectedItemCount === totalItemCount,
    );
  }

  someItemsSelected(): boolean {
    return this.selectedCount() > 0 && !this.allItemsSelected();
  }

  // Helper methods for PMO-specific messages
  private getPmoDetailsMessage(): string {
    switch (this.data.pmoType) {
      case 'ado':
        return APP_MESSAGES.ADO_DETAILS_MISSING;
      case 'jira':
        return 'Jira integration details are missing. Please configure Jira integration first.';
      default:
        return 'PMO integration details are missing. Please configure integration first.';
    }
  }

  private getInvalidCredentialsMessage(): string {
    switch (this.data.pmoType) {
      case 'ado':
        return APP_MESSAGES.ADO_INVALID_CREDENTIALS;
      case 'jira':
        return 'Invalid Jira credentials. Please check your credentials and try again.';
      default:
        return 'Invalid PMO credentials. Please check your credentials and try again.';
    }
  }
}
