import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  WorkflowProgressEvent,
  WorkflowType,
} from '../../model/interfaces/workflow-progress.interface';

interface WorkflowProgressState {
  [projectId: string]: {
    [workflowType: string]: WorkflowProgressEvent[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class WorkflowProgressService {
  private progressState: WorkflowProgressState = {};
  private progressSubject = new BehaviorSubject<WorkflowProgressState>({});

  constructor() {}

  /**
   * Add a new progress event for a specific project and workflow type
   */
  addProgressEvent(
    projectId: string,
    workflowType: WorkflowType,
    event: WorkflowProgressEvent,
  ): void {
    if (!this.progressState[projectId]) {
      this.progressState[projectId] = {};
    }

    if (!this.progressState[projectId][workflowType]) {
      this.progressState[projectId][workflowType] = [];
    }

    this.progressState[projectId][workflowType].push(event);
    this.progressSubject.next({ ...this.progressState });
  }

  /**
   * Get progress events for a specific project and workflow type
   */
  getProgressEvents(
    projectId: string,
    workflowType: WorkflowType,
  ): WorkflowProgressEvent[] {
    return this.progressState[projectId]?.[workflowType] || [];
  }

  /**
   * Get observable for progress events of a specific project and workflow type
   */
  getProgressEvents$(
    projectId: string,
    workflowType: WorkflowType,
  ): Observable<WorkflowProgressEvent[]> {
    return new Observable((subscriber) => {
      const subscription = this.progressSubject.subscribe((state) => {
        const events = state[projectId]?.[workflowType] || [];
        subscriber.next(events);
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Clear progress events for a specific project and workflow type
   */
  clearProgressEvents(projectId: string, workflowType: WorkflowType): void {
    if (this.progressState[projectId]?.[workflowType]) {
      this.progressState[projectId][workflowType] = [];
      this.progressSubject.next({ ...this.progressState });
    }
  }

  /**
   * Clear all progress events for a specific project
   */
  clearAllProgressForProject(projectId: string): void {
    if (this.progressState[projectId]) {
      delete this.progressState[projectId];
      this.progressSubject.next({ ...this.progressState });
    }
  }

  /**
   * Get the latest progress event for a specific project and workflow type
   */
  getLatestProgressEvent(
    projectId: string,
    workflowType: WorkflowType,
  ): WorkflowProgressEvent | null {
    const events = this.getProgressEvents(projectId, workflowType);
    return events.length > 0 ? events[events.length - 1] : null;
  }

  /**
   * Check if workflow has any progress events
   */
  hasProgressEvents(projectId: string, workflowType: WorkflowType): boolean {
    return this.getProgressEventCount(projectId, workflowType) > 0;
  }

  /**
   * Get count of progress events for a specific project and workflow type
   */
  getProgressEventCount(projectId: string, workflowType: WorkflowType): number {
    return this.getProgressEvents(projectId, workflowType).length;
  }
}
