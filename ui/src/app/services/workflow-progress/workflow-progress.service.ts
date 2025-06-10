import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { IpcRendererEvent } from 'electron';
import {
  WorkflowProgressEvent,
  WorkflowType,
  WorkflowErrorEvent,
  WorkflowStatus,
  WorkflowProgressState,
  WorkflowStatusState,
  ActiveListener,
  WORKFLOW_PROGRESS_CONFIG,
  WorkflowProgressError,
} from '../../model/interfaces/workflow-progress.interface';
import { ElectronService } from '../../electron-bridge/electron.service';

@Injectable({
  providedIn: 'root',
})
export class WorkflowProgressService implements OnDestroy {
  private readonly progressState: WorkflowProgressState = {};
  private readonly progressSubject = new BehaviorSubject<WorkflowProgressState>(
    {},
  );
  private readonly statusState: WorkflowStatusState = {};
  private readonly statusSubject = new BehaviorSubject<WorkflowStatusState>({});
  private readonly activeListeners = new Map<string, ActiveListener>();
  private readonly destroy$ = new Subject<void>();

  public readonly progressState$ = this.progressSubject
    .asObservable()
    .pipe(distinctUntilChanged(), shareReplay(1));

  public readonly statusState$ = this.statusSubject
    .asObservable()
    .pipe(distinctUntilChanged(), shareReplay(1));

  constructor(
    private readonly ngZone: NgZone,
    private readonly electronService: ElectronService,
  ) {
    this.initializeService();
  }

  private initializeService(): void {
    try {
      this.progressSubject.pipe(takeUntil(this.destroy$)).subscribe();
    } catch (error) {
      this.handleError(
        'Failed to initialize WorkflowProgressService',
        'INIT_ERROR',
        { error },
      );
    }
  }

  /**
   * Add a new progress event for a specific project and workflow type
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow (Solution, Story, Task)
   * @param event - Progress event to add
   * @throws {WorkflowProgressError} When validation fails or operation encounters an error
   */
  public addProgressEvent(
    projectId: string,
    workflowType: WorkflowType,
    event: WorkflowProgressEvent,
  ): void {
    this.validateInputs({ projectId, workflowType, event });

    try {
      this.ngZone.run(() => {
        const updatedState = this.createUpdatedState(
          projectId,
          workflowType,
          event,
        );
        Object.assign(this.progressState, updatedState);
        this.progressSubject.next({ ...this.progressState });
      });
    } catch (error) {
      this.handleError('Failed to add progress event', 'ADD_EVENT_ERROR', {
        projectId,
        workflowType,
        event,
        error,
      });
    }
  }

  /**
   * Get progress events for a specific project and workflow type
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns Array of workflow progress events (empty array if none exist)
   */
  public getProgressEvents(
    projectId: string,
    workflowType: WorkflowType,
  ): WorkflowProgressEvent[] {
    this.validateInputs({ projectId, workflowType });

    try {
      return this.progressState[projectId]?.[workflowType] || [];
    } catch (error) {
      this.handleError('Failed to get progress events', 'GET_EVENTS_ERROR', {
        projectId,
        workflowType,
        error,
      });
    }
  }

  /**
   * Get observable stream for progress events of a specific project and workflow type
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns Observable stream of workflow progress events
   */
  public getProgressEvents$(
    projectId: string,
    workflowType: WorkflowType,
  ): Observable<WorkflowProgressEvent[]> {
    this.validateInputs({ projectId, workflowType });

    return this.progressState$.pipe(
      map((state) => state[projectId]?.[workflowType] || []),
      distinctUntilChanged(
        (prev, curr) =>
          prev.length === curr.length &&
          prev.every((event, index) => event === curr[index]),
      ),
      takeUntil(this.destroy$),
    );
  }

  /**
   * Observable that emits `true` if any content (Solution, Story, or Task)
   * is currently being generated across any project and workflow type.
   *
   * @returns Observable that emits a boolean indicating if any content generation is in progress
   */
  public isAnyContentGenerationInProgress$(): Observable<boolean> {
    return this.statusState$.pipe(
      map((statusMap) => {
        return Object.values(statusMap).some((project) =>
          Object.values(project).some((status) => status.isCreating),
        );
      }),
      distinctUntilChanged(),
    );
  }

  /**
   * Clear progress events for a specific project and workflow type
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   */
  public clearProgressEvents(
    projectId: string,
    workflowType: WorkflowType,
  ): void {
    this.validateInputs({ projectId, workflowType });

    try {
      if (this.progressState[projectId]?.[workflowType]) {
        const updatedState = { ...this.progressState };
        updatedState[projectId] = {
          ...updatedState[projectId],
          [workflowType]: [],
        };
        Object.assign(this.progressState, updatedState);
        this.progressSubject.next(updatedState);
      }
    } catch (error) {
      this.handleError(
        'Failed to clear progress events',
        'CLEAR_EVENTS_ERROR',
        { projectId, workflowType, error },
      );
    }
  }

  /**
   * Clear all progress events for a specific project
   *
   * @param projectId - Unique identifier for the project
   */
  public clearAllProgressForProject(projectId: string): void {
    this.validateInputs({ projectId });

    try {
      if (this.progressState[projectId]) {
        const updatedState = { ...this.progressState };
        delete updatedState[projectId];
        Object.assign(this.progressState, updatedState);
        this.progressSubject.next(updatedState);
      }
    } catch (error) {
      this.handleError(
        'Failed to clear all progress for project',
        'CLEAR_PROJECT_ERROR',
        { projectId, error },
      );
    }
  }

  /**
   * Get the latest progress event for a specific project and workflow type
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns Latest progress event or null if none exist
   */
  public getLatestProgressEvent(
    projectId: string,
    workflowType: WorkflowType,
  ): WorkflowProgressEvent | null {
    try {
      const events = this.getProgressEvents(projectId, workflowType);
      return events.length > 0 ? events[events.length - 1] : null;
    } catch (error) {
      this.handleError(
        'Failed to get latest progress event',
        'GET_LATEST_ERROR',
        { projectId, workflowType, error },
      );
    }
  }

  /**
   * Check if workflow has any progress events
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns True if events exist, false otherwise
   */
  public hasProgressEvents(
    projectId: string,
    workflowType: WorkflowType,
  ): boolean {
    try {
      return this.getProgressEventCount(projectId, workflowType) > 0;
    } catch (error) {
      this.handleError(
        'Failed to check if progress events exist',
        'HAS_EVENTS_ERROR',
        { projectId, workflowType, error },
      );
    }
  }

  /**
   * Get count of progress events for a specific project and workflow type
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns Number of progress events
   */
  public getProgressEventCount(
    projectId: string,
    workflowType: WorkflowType,
  ): number {
    try {
      return this.getProgressEvents(projectId, workflowType).length;
    } catch (error) {
      this.handleError(
        'Failed to get progress event count',
        'GET_COUNT_ERROR',
        { projectId, workflowType, error },
      );
    }
  }

  /**
   * Register a global workflow progress listener that persists across navigation
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @param electronService - Electron service instance for IPC communication
   * @throws {WorkflowProgressError} When registration fails
   */
  public registerGlobalListener(
    projectId: string,
    workflowType: WorkflowType,
    electronService: ElectronService,
  ): void {
    this.validateInputs({ projectId, workflowType, electronService });

    try {
      const listenerKey = this.generateListenerKey(projectId, workflowType);

      if (this.activeListeners.has(listenerKey)) {
        this.removeGlobalListener(projectId, workflowType, electronService);
      }

      const callback = (_: IpcRendererEvent, data: WorkflowProgressEvent) => {
        this.addProgressEvent(projectId, workflowType, data);
      };

      this.activeListeners.set(listenerKey, {
        projectId,
        workflowType,
        callback,
      });

      electronService.listenWorkflowProgress(workflowType, projectId, callback);
    } catch (error) {
      this.handleError(
        'Failed to register global listener',
        'REGISTER_LISTENER_ERROR',
        { projectId, workflowType, error },
      );
    }
  }

  /**
   * Remove a global workflow progress listener
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @param electronService - Electron service instance for IPC communication
   */
  public removeGlobalListener(
    projectId: string,
    workflowType: WorkflowType,
    electronService: ElectronService,
  ): void {
    this.validateInputs({ projectId, workflowType, electronService });

    try {
      const listenerKey = this.generateListenerKey(projectId, workflowType);
      const listener = this.activeListeners.get(listenerKey);

      if (listener) {
        electronService.removeWorkflowProgressListener(
          workflowType,
          projectId,
          listener.callback,
        );
        this.activeListeners.delete(listenerKey);
      }
    } catch (error) {
      this.handleError(
        'Failed to remove global listener',
        'REMOVE_LISTENER_ERROR',
        { projectId, workflowType, error },
      );
    }
  }

  /**
   * Check if a global listener is already registered
   *
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns True if listener exists, false otherwise
   */
  public hasGlobalListener(
    projectId: string,
    workflowType: WorkflowType,
  ): boolean {
    try {
      const listenerKey = this.generateListenerKey(projectId, workflowType);
      return this.activeListeners.has(listenerKey);
    } catch (error) {
      this.handleError(
        'Failed to check if global listener exists',
        'HAS_LISTENER_ERROR',
        { projectId, workflowType, error },
      );
    }
  }

  /**
   * Remove all global listeners for cleanup
   *
   * @param electronService - Electron service instance for IPC communication
   */
  public removeAllGlobalListeners(electronService: ElectronService): void {
    this.validateInputs({ electronService });

    try {
      this.activeListeners.forEach((listener) => {
        electronService.removeWorkflowProgressListener(
          listener.workflowType,
          listener.projectId,
          listener.callback,
        );
      });
      this.activeListeners.clear();
    } catch (error) {
      this.handleError(
        'Failed to remove all global listeners',
        'REMOVE_ALL_LISTENERS_ERROR',
        { error },
      );
    }
  }

  /**
   * Set creation status for a specific project and workflow type
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow (Solution, Story, Task)
   * @param status - Creation status with isCreating and isComplete flags
   */
  public setCreationStatus(
    projectId: string,
    workflowType: WorkflowType,
    status: WorkflowStatus,
  ): void {
    this.validateInputs({ projectId, workflowType, status });

    try {
      const updatedState = { ...this.statusState };

      if (!updatedState[projectId]) {
        updatedState[projectId] = {};
      }

      updatedState[projectId][workflowType] = { ...status };

      Object.assign(this.statusState, updatedState);
      this.statusSubject.next(updatedState);
    } catch (error) {
      this.handleError('Failed to set creation status', 'SET_STATUS_ERROR', {
        projectId,
        workflowType,
        status,
        error,
      });
    }
  }

  /**
   * Get creation status for a specific project and workflow type
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns WorkflowStatus or default status if not found
   */
  public getCreationStatus(
    projectId: string,
    workflowType: WorkflowType,
  ): WorkflowStatus {
    this.validateInputs({ projectId, workflowType });

    try {
      return (
        this.statusState[projectId]?.[workflowType] || this.getDefaultStatus()
      );
    } catch (error) {
      this.handleError('Failed to get creation status', 'GET_STATUS_ERROR', {
        projectId,
        workflowType,
        error,
      });
    }
  }

  /**
   * Get observable stream for creation status of a specific project and workflow type
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns Observable stream of WorkflowStatus
   */
  public getCreationStatusObservable(
    projectId: string,
    workflowType: WorkflowType,
  ): Observable<WorkflowStatus> {
    this.validateInputs({ projectId, workflowType });

    return this.statusState$.pipe(
      map(
        (state) => state[projectId]?.[workflowType] || this.getDefaultStatus(),
      ),
      distinctUntilChanged(
        (prev, curr) =>
          prev.isCreating === curr.isCreating &&
          prev.isComplete === curr.isComplete,
      ),
      takeUntil(this.destroy$),
    );
  }

  /**
   * Clear creation status for a specific project and workflow type
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   */
  public clearCreationStatus(
    projectId: string,
    workflowType: WorkflowType,
  ): void {
    this.validateInputs({ projectId, workflowType });

    try {
      if (this.statusState[projectId]?.[workflowType]) {
        const updatedState = { ...this.statusState };
        delete updatedState[projectId][workflowType];

        if (Object.keys(updatedState[projectId]).length === 0) {
          delete updatedState[projectId];
        }

        Object.assign(this.statusState, updatedState);
        this.statusSubject.next(updatedState);
      }
    } catch (error) {
      this.handleError(
        'Failed to clear creation status',
        'CLEAR_STATUS_ERROR',
        {
          projectId,
          workflowType,
          error,
        },
      );
    }
  }

  /**
   * Check if a workflow is currently being created
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns True if workflow is being created, false otherwise
   */
  public isCreating(projectId: string, workflowType: WorkflowType): boolean {
    return this.getCreationStatus(projectId, workflowType).isCreating;
  }

  /**
   * Check if a workflow creation is complete
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   * @returns True if workflow creation is complete, false otherwise
   */
  public isComplete(projectId: string, workflowType: WorkflowType): boolean {
    return this.getCreationStatus(projectId, workflowType).isComplete;
  }

  /**
   * Set workflow as creating
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   */
  public async setCreating(
    projectId: string,
    workflowType: WorkflowType,
  ): Promise<void> {
    this.setCreationStatus(projectId, workflowType, {
      isCreating: true,
      isComplete: false,
    });

    try {
      await this.electronService.setContentGenerationStatus(
        projectId,
        workflowType,
        true,
      );
    } catch (error) {
      console.error('Failed to set content generation status:', error);
    }
  }

  /**
   * Set workflow as complete
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   */
  public async setComplete(
    projectId: string,
    workflowType: WorkflowType,
  ): Promise<void> {
    this.setCreationStatus(projectId, workflowType, {
      isCreating: false,
      isComplete: true,
    });

    try {
      await this.electronService.setContentGenerationStatus(
        projectId,
        workflowType,
        false,
      );
    } catch (error) {
      console.error('Failed to set content generation status:', error);
    }
  }

  /**
   * Set workflow as failed/stopped
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   */
  public async setFailed(
    projectId: string,
    workflowType: WorkflowType,
    failureInfo?: Partial<WorkflowErrorEvent>,
  ): Promise<void> {
    this.setCreationStatus(projectId, workflowType, {
      isCreating: false,
      isComplete: false,
      isFailed: true,
      failureInfo: {
        timestamp: failureInfo?.timestamp || new Date().toISOString(),
        reason: failureInfo?.reason || 'Unknown error occurred',
      },
    });

    try {
      await this.electronService.setContentGenerationStatus(
        projectId,
        workflowType,
        false,
      );
    } catch (error) {
      console.error('Failed to set content generation status:', error);
    }
  }

  /**
   * Abort a workflow operation
   * @param projectId - Unique identifier for the project
   * @param workflowType - Type of workflow
   */
  public async abortWorkflow(
    projectId: string,
    workflowType: WorkflowType,
  ): Promise<boolean> {
    try {
      let success = false;

      switch (workflowType) {
        case 'solution':
          success = await this.electronService.abortSolutionCreation(projectId);
          break;
        default:
          console.warn(
            `Abort not implemented for workflow type: ${workflowType}`,
          );
          return false;
      }

      if (success) {
        await this.electronService.setContentGenerationStatus(
          projectId,
          workflowType,
          false,
        );
      }

      return success;
    } catch (error) {
      console.error(`Failed to abort ${workflowType} workflow:`, error);
      return false;
    }
  }

  /**
   * Get all creation statuses for a specific project
   * @param projectId - Unique identifier for the project
   * @returns Object with all statuses for the project
   */
  public getAllCreationStatusForProject(projectId: string): {
    [workflowType: string]: WorkflowStatus;
  } {
    this.validateInputs({ projectId });
    return this.statusState[projectId] || {};
  }

  private getDefaultStatus(): WorkflowStatus {
    return { isCreating: false, isComplete: false };
  }

  public ngOnDestroy(): void {
    try {
      this.destroy$.next();
      this.destroy$.complete();
      this.progressSubject.complete();
      this.statusSubject.complete();
      this.activeListeners.clear();
    } catch (error) {
      console.error('Error during WorkflowProgressService cleanup:', error);
    }
  }

  private createUpdatedState(
    projectId: string,
    workflowType: WorkflowType,
    event: WorkflowProgressEvent,
  ): WorkflowProgressState {
    const updatedState = { ...this.progressState };

    if (!updatedState[projectId]) {
      updatedState[projectId] = {};
    }

    if (!updatedState[projectId][workflowType]) {
      updatedState[projectId][workflowType] = [];
    }

    const currentEvents = [...updatedState[projectId][workflowType]];
    currentEvents.push(event);

    if (
      currentEvents.length > WORKFLOW_PROGRESS_CONFIG.MAX_EVENTS_PER_WORKFLOW
    ) {
      currentEvents.splice(
        0,
        currentEvents.length - WORKFLOW_PROGRESS_CONFIG.MAX_EVENTS_PER_WORKFLOW,
      );
    }

    updatedState[projectId] = {
      ...updatedState[projectId],
      [workflowType]: currentEvents,
    };

    return updatedState;
  }

  private generateListenerKey(
    projectId: string,
    workflowType: WorkflowType,
  ): string {
    return `${projectId}${WORKFLOW_PROGRESS_CONFIG.LISTENER_KEY_SEPARATOR}${workflowType}`;
  }

  private validateInputs(inputs: Record<string, unknown>): void {
    Object.entries(inputs).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        throw new WorkflowProgressError(
          `Invalid input: ${key} cannot be null or undefined`,
          'VALIDATION_ERROR',
          { key, value },
        );
      }

      if (typeof value === 'string' && value.trim() === '') {
        throw new WorkflowProgressError(
          `Invalid input: ${key} cannot be empty string`,
          'VALIDATION_ERROR',
          { key, value },
        );
      }
    });
  }

  private handleError(
    message: string,
    code: string,
    context?: Record<string, unknown>,
  ): never {
    const error = new WorkflowProgressError(message, code, context);
    console.error(`[WorkflowProgressService] ${message}`, context);
    throw error;
  }
}
