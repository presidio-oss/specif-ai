import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroExclamationTriangle,
  heroClock,
  heroTag,
  heroInformationCircle,
  heroPlus,
  heroDocumentText,
  heroChevronUp,
} from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '../core/button/button.component';
import { WorkflowProgressComponent } from '../workflow-progress/workflow-progress.component';
import {
  WorkflowErrorEvent,
  WorkflowType,
} from 'src/app/model/interfaces/workflow-progress.interface';
import { WorkflowProgressService } from 'src/app/services/workflow-progress/workflow-progress.service';

@Component({
  selector: 'app-project-failure-message',
  templateUrl: './project-failure-message.component.html',
  standalone: true,
  imports: [NgIf, NgIconComponent, ButtonComponent, WorkflowProgressComponent],
  providers: [
    provideIcons({
      heroExclamationTriangle,
      heroClock,
      heroTag,
      heroInformationCircle,
      heroPlus,
      heroDocumentText,
      heroChevronUp,
    }),
  ],
})
export class ProjectFailureMessageComponent {
  @Input() failureInfo: WorkflowErrorEvent | null = null;
  @Input() projectName: string = '';
  @Input() projectId: string = '';
  @Input() workflowType: WorkflowType = WorkflowType.Solution;

  @Output() retryClicked = new EventEmitter<void>();

  showLogs: boolean = false;
  isLoadingLogs: boolean = false;

  constructor(
    private router: Router,
    private workflowProgressService: WorkflowProgressService,
  ) {}

  get failureReason(): string {
    if (!this.failureInfo) return 'Unknown failure reason';
    return (
      this.failureInfo.reason || 'An error occurred during project creation'
    );
  }

  get formattedFailureTimestamp(): string {
    if (!this.failureInfo?.timestamp) return '';

    const date = new Date(this.failureInfo.timestamp);
    return date.toLocaleString();
  }

  onRetryClick(): void {
    this.retryClicked.emit();
  }

  onCreateNewProjectClick(): void {
    this.router.navigate(['/apps/create']);
  }

  toggleLogs(): void {
    this.showLogs = !this.showLogs;
  }

  get hasLogs(): boolean {
    return !!(
      this.projectId &&
      this.workflowProgressService.hasProgressEvents(
        this.projectId,
        this.workflowType,
      )
    );
  }

  get logsButtonText(): string {
    return this.showLogs ? 'Hide Logs' : 'View Logs';
  }

  get logsButtonIcon(): string {
    return this.showLogs ? 'heroChevronUp' : 'heroDocumentText';
  }
}
