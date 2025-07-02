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
    }),
  ],
})
export class PmoIntegrationModalComponent implements OnInit {
  isLoading = signal<boolean>(true);
  isLoadingWorkItems = signal<boolean>(false);
  connectionStatus = signal<PmoConnectionStatus>({
    isConnected: false,
  });

  featuresWithChildren = signal<Ticket[]>([]);
  expandedFeatureIds = signal<Set<number>>(new Set());
  expandedPlatformFeatureIds = signal<Set<number>>(new Set());

  // Selected items
  selectedFeatureIds = signal<Set<number>>(new Set());
  selectedPlatformFeatureIds = signal<Set<number>>(new Set());
  selectedUserStoryIds = signal<Set<number>>(new Set());

  // Select all state
  allItemsSelected = signal<boolean>(false);

  // PMO service and configuration
  private pmoService: PmoService;
  public config: PmoModalConfig;

  statusIcon = computed(() => {
    const status = this.connectionStatus();
    if (this.isLoading()) return 'heroArrowPath';
    return status.isConnected ? 'heroCheckCircle' : 'heroXCircle';
  });

  statusText = computed(() => {
    if (this.isLoading()) return this.config.connectionLabels.checking;
    const status = this.connectionStatus();
    return status.isConnected
      ? this.config.connectionLabels.connected
      : this.config.connectionLabels.disconnected;
  });

  statusColor = computed(() => {
    if (this.isLoading()) return 'text-blue-600';
    const status = this.connectionStatus();
    return status.isConnected ? 'text-green-600' : 'text-red-600';
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PmoIntegrationData,
    private dialogRef: MatDialogRef<PmoIntegrationModalComponent>,
    private toasterService: ToasterService,
    private pmoServiceFactory: PmoServiceFactory,
  ) {
    this.pmoService = this.pmoServiceFactory.getPmoService(this.data.pmoType);
    this.config = PMO_MODAL_CONFIGS[this.data.pmoType];

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
        await this.loadFeaturesHierarchy();
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

  async loadFeaturesHierarchy(): Promise<void> {
    try {
      this.isLoadingWorkItems.set(true);
      const featuresHierarchy = await this.pmoService.getFeaturesHierarchy();
      this.featuresWithChildren.set(featuresHierarchy);

      // Expand all features and platform features by default
      this.expandAllItemsByDefault(featuresHierarchy);
    } catch (error) {
      console.error(
        `Error loading ${this.data.pmoType.toUpperCase()} work items:`,
        error,
      );
      this.toasterService.showError(
        `Failed to load ${this.data.pmoType.toUpperCase()} work items`,
      );
    } finally {
      this.isLoadingWorkItems.set(false);
    }
  }

  private expandAllItemsByDefault(featuresHierarchy: Ticket[]): void {
    // Create new Sets to store the expanded IDs
    const featureIds = new Set<number>();
    const platformFeatureIds = new Set<number>();

    // Add all feature IDs to the expanded set
    featuresHierarchy.forEach((feature) => {
      featureIds.add(parseInt(feature.pmoId));

      // Add all platform feature IDs under each feature to the expanded set
      if (feature.child && feature.child.length > 0) {
        feature.child.forEach((platformFeature: Ticket) => {
          platformFeatureIds.add(parseInt(platformFeature.pmoId));
        });
      }
    });

    // Update the signals with all items expanded
    this.expandedFeatureIds.set(featureIds);
    this.expandedPlatformFeatureIds.set(platformFeatureIds);
  }

  toggleFeatureExpansion(featureId: number): void {
    const currentExpanded = this.expandedFeatureIds();
    const newExpanded = new Set(currentExpanded);

    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }

    this.expandedFeatureIds.set(newExpanded);
  }

  togglePlatformFeatureExpansion(platformFeatureId: number): void {
    const currentExpanded = this.expandedPlatformFeatureIds();
    const newExpanded = new Set(currentExpanded);

    if (newExpanded.has(platformFeatureId)) {
      newExpanded.delete(platformFeatureId);
    } else {
      newExpanded.add(platformFeatureId);
    }

    this.expandedPlatformFeatureIds.set(newExpanded);
  }

  isFeatureExpanded(featureId: number): boolean {
    return this.expandedFeatureIds().has(featureId);
  }

  isPlatformFeatureExpanded(platformFeatureId: number): boolean {
    return this.expandedPlatformFeatureIds().has(platformFeatureId);
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

        if (Object.values(selectedItems).every((array) => array.length === 0)) {
          this.toasterService.showWarning(
            'No items selected. Please select at least one item to import.',
          );
          return;
        }

        // Let the dialog caller know we have data to save
        this.dialogRef.close({
          proceed: true,
          action: this.data.folderName,
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
    const features = this.featuresWithChildren();

    // Containers for selected items
    const prds: Ticket[] = [];
    const userStories: Ticket[] = [];
    const tasks: Ticket[] = [];

    // Loop through all features (PRDs)
    features.forEach((feature) => {
      const featureId = parseInt(feature.pmoId);

      // If this feature is selected, add it to PRDs
      if (this.isFeatureSelected(featureId)) {
        // Create a copy of the feature with mapped properties for PRD
        const prd: Ticket = {
          pmoId: feature.pmoId,
          pmoIssueType: feature.pmoIssueType,
          pmoParentId: feature.pmoParentId,
          specifaiId: feature.specifaiId || `PRD${feature.pmoId}`,
          specifaiType: 'PRD', // Explicitly set to PRD
          specifaiParentId: null,
          title: feature.title,
          description: feature.description,
          child: [], // We'll handle the relationships separately
        };

        prds.push(prd);

        // Process Platform Features (User Stories) if they exist
        if (feature.child && feature.child.length > 0) {
          feature.child.forEach((platformFeature) => {
            const pfId = parseInt(platformFeature.pmoId);

            // If this platform feature is selected, add it to User Stories
            if (this.isPlatformFeatureSelected(pfId)) {
              // Create a copy of the platform feature with mapped properties for User Story
              const userStory: Ticket = {
                pmoId: platformFeature.pmoId,
                pmoIssueType: platformFeature.pmoIssueType,
                pmoParentId: platformFeature.pmoParentId,
                specifaiId:
                  platformFeature.specifaiId || `US${platformFeature.pmoId}`,
                specifaiType: 'User Story', // Map to User Story
                specifaiParentId: prd.specifaiId, // Link to parent PRD
                title: platformFeature.title,
                description: platformFeature.description,
                child: [], // We'll handle the relationships separately
              };

              userStories.push(userStory);

              // Process User Stories (Tasks) if they exist
              if (platformFeature.child && platformFeature.child.length > 0) {
                platformFeature.child.forEach((userStory) => {
                  const usId = parseInt(userStory.pmoId);

                  // If this user story is selected, add it to Tasks
                  if (this.isUserStorySelected(usId)) {
                    // Create a copy of the user story with mapped properties for Task
                    const task: Ticket = {
                      pmoId: userStory.pmoId,
                      pmoIssueType: userStory.pmoIssueType,
                      pmoParentId: userStory.pmoParentId,
                      specifaiId:
                        userStory.specifaiId || `TASK${userStory.pmoId}`,
                      specifaiType: 'Task', // Map to Task
                      specifaiParentId:
                        platformFeature.specifaiId ||
                        `US${platformFeature.pmoId}`, // Link to parent User Story
                      title: userStory.title,
                      description: userStory.description,
                      child: [], // No children for tasks
                    };

                    tasks.push(task);
                  }
                });
              }
            }
          });
        }
      }
    });

    return {
      prds,
      userStories,
      tasks,
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

    const features = this.featuresWithChildren();

    // New sets for selected items
    const featureIds = new Set<number>();
    const platformFeatureIds = new Set<number>();
    const userStoryIds = new Set<number>();

    if (isChecked) {
      // Add all items to their respective sets
      features.forEach((feature) => {
        featureIds.add(parseInt(feature.pmoId));

        if (feature.child && feature.child.length > 0) {
          feature.child.forEach((platformFeature: Ticket) => {
            platformFeatureIds.add(parseInt(platformFeature.pmoId));

            if (platformFeature.child && platformFeature.child.length > 0) {
              platformFeature.child.forEach((userStory: Ticket) => {
                userStoryIds.add(parseInt(userStory.pmoId));
              });
            }
          });
        }
      });
    }

    // Update all selection sets
    this.selectedFeatureIds.set(featureIds);
    this.selectedPlatformFeatureIds.set(platformFeatureIds);
    this.selectedUserStoryIds.set(userStoryIds);
  }

  toggleFeatureSelection(event: Event, featureId: number): void {
    // Stop the click event from propagating to parent elements
    event.stopPropagation();

    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;

    const currentSelected = this.selectedFeatureIds();
    const newSelected = new Set(currentSelected);

    // Toggle the feature selection
    if (isChecked) {
      newSelected.add(featureId);
    } else {
      newSelected.delete(featureId);
    }

    this.selectedFeatureIds.set(newSelected);

    // Handle cascading selection to children
    this.cascadeFeatureSelection(featureId, isChecked);

    // Update the "all selected" state
    this.updateAllSelectedState();
  }

  /**
   * Cascade feature selection to all its platform features and user stories
   */
  private cascadeFeatureSelection(
    featureId: number,
    isSelected: boolean,
  ): void {
    const features = this.featuresWithChildren();
    const feature = features.find((f) => parseInt(f.pmoId) === featureId);

    if (!feature || !feature.child) {
      return;
    }

    // Get current selections to modify
    const platformFeatureIds = new Set(this.selectedPlatformFeatureIds());
    const userStoryIds = new Set(this.selectedUserStoryIds());

    // Loop through all children and apply selection
    feature.child.forEach((platformFeature: Ticket) => {
      const pfId = parseInt(platformFeature.pmoId);
      if (isSelected) {
        platformFeatureIds.add(pfId);
      } else {
        platformFeatureIds.delete(pfId);
      }

      if (platformFeature.child && platformFeature.child.length > 0) {
        platformFeature.child.forEach((userStory: Ticket) => {
          const usId = parseInt(userStory.pmoId);
          if (isSelected) {
            userStoryIds.add(usId);
          } else {
            userStoryIds.delete(usId);
          }
        });
      }
    });

    // Update the selection sets
    this.selectedPlatformFeatureIds.set(platformFeatureIds);
    this.selectedUserStoryIds.set(userStoryIds);
  }

  togglePlatformFeatureSelection(
    event: Event,
    platformFeatureId: number,
  ): void {
    // Stop the click event from propagating to parent elements
    event.stopPropagation();

    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;

    const currentSelected = this.selectedPlatformFeatureIds();
    const newSelected = new Set(currentSelected);

    // Toggle the platform feature selection
    if (isChecked) {
      newSelected.add(platformFeatureId);

      // If selected, also select parent feature
      this.selectParentFeature(platformFeatureId);
    } else {
      newSelected.delete(platformFeatureId);
    }

    this.selectedPlatformFeatureIds.set(newSelected);

    // Handle cascading selection to children user stories
    // Always cascade selection/deselection to children
    this.cascadePlatformFeatureSelection(platformFeatureId, isChecked);

    // Update the "all selected" state
    this.updateAllSelectedState();
  }

  /**
   * Find and select the parent feature of a platform feature
   */
  private selectParentFeature(platformFeatureId: number): void {
    const features = this.featuresWithChildren();
    let parentFeature: Ticket | null = null;

    // Find the platform feature's parent feature
    for (const feature of features) {
      if (!feature.child) continue;

      const hasPlatformFeature = feature.child.some(
        (pf: Ticket) => parseInt(pf.pmoId) === platformFeatureId,
      );
      if (hasPlatformFeature) {
        parentFeature = feature;
        break;
      }
    }

    if (parentFeature) {
      // Select the parent feature
      const featureIds = new Set(this.selectedFeatureIds());
      featureIds.add(parseInt(parentFeature.pmoId));
      this.selectedFeatureIds.set(featureIds);
    }
  }

  /**
   * Cascade platform feature selection to all its user stories
   */
  private cascadePlatformFeatureSelection(
    platformFeatureId: number,
    isSelected: boolean,
  ): void {
    // Find the platform feature in the hierarchy
    let foundPlatformFeature: Ticket | undefined;

    const features = this.featuresWithChildren();
    for (const feature of features) {
      if (!feature.child) continue;

      const pf = feature.child.find(
        (pf: Ticket) => parseInt(pf.pmoId) === platformFeatureId,
      );
      if (pf) {
        foundPlatformFeature = pf;
        break;
      }
    }

    if (!foundPlatformFeature || !foundPlatformFeature.child) {
      return;
    }

    // Get current selections to modify
    const userStoryIds = new Set(this.selectedUserStoryIds());

    // Apply selection to all user stories
    foundPlatformFeature.child.forEach((userStory: Ticket) => {
      if (isSelected) {
        userStoryIds.add(parseInt(userStory.pmoId));
      } else {
        userStoryIds.delete(parseInt(userStory.pmoId));
      }
    });

    // Update the selection set
    this.selectedUserStoryIds.set(userStoryIds);
  }

  toggleUserStorySelection(event: Event, userStoryId: number): void {
    // Stop the click event from propagating to parent elements
    event.stopPropagation();

    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;

    const currentSelected = this.selectedUserStoryIds();
    const newSelected = new Set(currentSelected);

    // Toggle the user story selection
    if (isChecked) {
      newSelected.add(userStoryId);

      // If selected, select all parents in hierarchy (platform feature and feature)
      this.selectParentHierarchy(userStoryId);
    } else {
      newSelected.delete(userStoryId);
    }

    this.selectedUserStoryIds.set(newSelected);

    // Update the "all selected" state
    this.updateAllSelectedState();
  }

  /**
   * Automatically selects the entire parent hierarchy of a user story
   * (both platform feature and feature)
   */
  private selectParentHierarchy(userStoryId: number): void {
    const features = this.featuresWithChildren();
    let foundPlatformFeature: Ticket | undefined = undefined;
    let foundFeature: Ticket | undefined = undefined;

    // Find the user story's parent platform feature and grandparent feature
    for (const feature of features) {
      if (!feature.child) continue;

      for (const platformFeature of feature.child) {
        if (!platformFeature.child) continue;

        const foundUserStory = platformFeature.child.find(
          (us: Ticket) => parseInt(us.pmoId) === userStoryId,
        );
        if (foundUserStory) {
          foundPlatformFeature = platformFeature;
          foundFeature = feature;
          break;
        }
      }
      if (foundPlatformFeature) break;
    }

    if (foundPlatformFeature && foundFeature) {
      // Select the platform feature
      const platformFeatureIds = new Set(this.selectedPlatformFeatureIds());
      platformFeatureIds.add(parseInt(foundPlatformFeature.pmoId));
      this.selectedPlatformFeatureIds.set(platformFeatureIds);

      // Select the feature
      const featureIds = new Set(this.selectedFeatureIds());
      featureIds.add(parseInt(foundFeature.pmoId));
      this.selectedFeatureIds.set(featureIds);
    }
  }

  isFeatureSelected(featureId: number): boolean {
    return this.selectedFeatureIds().has(featureId);
  }

  isPlatformFeatureSelected(platformFeatureId: number): boolean {
    return this.selectedPlatformFeatureIds().has(platformFeatureId);
  }

  isUserStorySelected(userStoryId: number): boolean {
    return this.selectedUserStoryIds().has(userStoryId);
  }

  // Helper method to make parseInt accessible from the template
  parseInt(value: string): number {
    return parseInt(value);
  }

  private updateAllSelectedState(): void {
    // Count all items
    let totalItemCount = 0;
    let selectedItemCount = 0;

    const features = this.featuresWithChildren();
    features.forEach((feature) => {
      totalItemCount++; // Count the feature
      if (this.isFeatureSelected(parseInt(feature.pmoId))) {
        selectedItemCount++;
      }

      if (feature.child && feature.child.length > 0) {
        feature.child.forEach((platformFeature: Ticket) => {
          totalItemCount++; // Count the platform feature
          if (this.isPlatformFeatureSelected(parseInt(platformFeature.pmoId))) {
            selectedItemCount++;
          }

          if (platformFeature.child && platformFeature.child.length > 0) {
            platformFeature.child.forEach((userStory: Ticket) => {
              totalItemCount++; // Count the user story
              if (this.isUserStorySelected(parseInt(userStory.pmoId))) {
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

  // Helper methods for getting badge colors
  getTopLevelBadgeColor(): string {
    return this.config.badgeColors.topLevel;
  }

  getMidLevelBadgeColor(): string {
    return this.config.badgeColors.midLevel;
  }

  getBottomLevelBadgeColor(): string {
    return this.config.badgeColors.bottomLevel;
  }
}
