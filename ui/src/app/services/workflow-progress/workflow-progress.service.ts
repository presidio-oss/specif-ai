import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { IpcRendererEvent } from 'electron';
import {
  WorkflowProgressEvent,
  WorkflowType,
} from '../../model/interfaces/workflow-progress.interface';
import { ElectronService } from '../../electron-bridge/electron.service';

interface WorkflowProgressState {
  [projectId: string]: {
    [workflowType: string]: WorkflowProgressEvent[];
  };
}

interface ActiveListener {
  readonly projectId: string;
  readonly workflowType: WorkflowType;
  readonly callback: (
    event: IpcRendererEvent,
    data: WorkflowProgressEvent,
  ) => void;
}

const WORKFLOW_PROGRESS_CONFIG = {
  MAX_EVENTS_PER_WORKFLOW: 1000,
  LISTENER_KEY_SEPARATOR: '-',
  DEFAULT_TIMEOUT: 5000,
} as const;

class WorkflowProgressError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'WorkflowProgressError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class WorkflowProgressService implements OnDestroy {
  private readonly progressState: WorkflowProgressState = {};
  private readonly progressSubject = new BehaviorSubject<WorkflowProgressState>(
    {},
  );
  private readonly activeListeners = new Map<string, ActiveListener>();
  private readonly destroy$ = new Subject<void>();

  public readonly progressState$ = this.progressSubject
    .asObservable()
    .pipe(distinctUntilChanged(), shareReplay(1));

  constructor(private readonly ngZone: NgZone) {
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

  public ngOnDestroy(): void {
    try {
      this.destroy$.next();
      this.destroy$.complete();
      this.progressSubject.complete();
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
