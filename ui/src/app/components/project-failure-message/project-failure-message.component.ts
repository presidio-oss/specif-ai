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
} from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '../core/button/button.component';
import { WorkflowErrorEvent } from 'src/app/model/interfaces/workflow-progress.interface';

@Component({
  selector: 'app-project-failure-message',
  templateUrl: './project-failure-message.component.html',
  standalone: true,
  imports: [NgIf, NgIconComponent, ButtonComponent],
  providers: [
    provideIcons({
      heroExclamationTriangle,
      heroClock,
      heroTag,
      heroInformationCircle,
      heroPlus,
    }),
  ],
})
export class ProjectFailureMessageComponent {
  @Input() failureInfo: WorkflowErrorEvent | null = null;
  @Input() projectName: string = '';

  @Output() retryClicked = new EventEmitter<void>();

  constructor(private router: Router) {}

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
}
