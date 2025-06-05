import { Component, Input, OnInit } from '@angular/core';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSparkles,
  heroCheckCircle,
  heroWrenchScrewdriver,
} from '@ng-icons/heroicons/outline';
import {
  WorkflowProgressEvent,
  WorkflowType,
} from '../../model/interfaces/workflow-progress.interface';
import { CustomAccordionComponent } from '../custom-accordion/custom-accordion.component';
import { WorkflowProgressService } from '../../services/workflow-progress/workflow-progress.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-workflow-progress',
  templateUrl: './workflow-progress.component.html',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    AsyncPipe,
    NgIconComponent,
    CustomAccordionComponent,
  ],
  providers: [
    provideIcons({
      heroSparkles,
      heroCheckCircle,
      heroWrenchScrewdriver,
    }),
  ],
})
export class WorkflowProgressComponent implements OnInit {
  @Input() projectId!: string;
  @Input() workflowType!: WorkflowType;
  @Input() isVisible: boolean = false;
  @Input() title: string = 'Creating Solution...';
  @Input() subtitle: string = 'Relax while SpecifAI takes care of the rest...';
  @Input() maxHeight: string = '24rem';

  progress$!: Observable<WorkflowProgressEvent[]>;

  constructor(private workflowProgressService: WorkflowProgressService) {}

  ngOnInit(): void {
    if (this.projectId && this.workflowType) {
      this.progress$ = this.workflowProgressService.getProgressEvents$(
        this.projectId,
        this.workflowType,
      );
    }
  }

  hasInputOutput(event: WorkflowProgressEvent): boolean {
    return (
      (event.type === 'mcp' || event.type === 'action') &&
      (!!event.message.input || !!event.message.output)
    );
  }

  getAccordionId(event: WorkflowProgressEvent, index: number): string {
    return `progress-${event.type}-${index}-${event.timestamp}`;
  }

  formatData(data: any): string {
    if (data === null || data === undefined) {
      return '';
    }

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }

    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  }

  shouldShowSpinner(
    event: WorkflowProgressEvent,
    progress: WorkflowProgressEvent[],
  ): boolean {
    if (event.type === 'action') {
      return false;
    }

    if (event.correlationId) {
      const hasCorrespondingCompletion = progress.some(
        (e: WorkflowProgressEvent) =>
          e.correlationId === event.correlationId &&
          (e.type === 'action' || e.type === 'mcp') &&
          e !== event,
      );
      return !hasCorrespondingCompletion;
    }

    const currentIndex = progress.indexOf(event);

    let lastActionIndex = -1;
    for (let i = progress.length - 1; i >= 0; i--) {
      if (progress[i].type === 'action') {
        lastActionIndex = i;
        break;
      }
    }

    return currentIndex > lastActionIndex;
  }
}
