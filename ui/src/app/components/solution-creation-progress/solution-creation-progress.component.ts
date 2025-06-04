import { Component, Input } from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSparkles,
  heroCheckCircle,
  heroWrenchScrewdriver,
} from '@ng-icons/heroicons/outline';
import { WorkflowProgressEvent } from '../../model/interfaces/workflow-progress.interface';
import { CustomAccordionComponent } from '../custom-accordion/custom-accordion.component';

@Component({
  selector: 'app-solution-creation-progress',
  templateUrl: './solution-creation-progress.component.html',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
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
export class SolutionCreationProgressComponent {
  @Input() progress: WorkflowProgressEvent[] = [];
  @Input() isVisible: boolean = false;
  @Input() title: string = 'Creating Solution...';
  @Input() subtitle: string = 'Relax while SpecifAI takes care of the rest...';

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

  shouldShowSpinner(event: WorkflowProgressEvent): boolean {
    if (event.type === 'action') {
      return false;
    }

    if (event.correlationId) {
      const hasCorrespondingCompletion = this.progress.some(
        (e) =>
          e.correlationId === event.correlationId &&
          (e.type === 'action' || e.type === 'mcp') &&
          e !== event,
      );
      return !hasCorrespondingCompletion;
    }

    const currentIndex = this.progress.indexOf(event);

    let lastActionIndex = -1;
    for (let i = this.progress.length - 1; i >= 0; i--) {
      if (this.progress[i].type === 'action') {
        lastActionIndex = i;
        break;
      }
    }

    return currentIndex > lastActionIndex;
  }
}
