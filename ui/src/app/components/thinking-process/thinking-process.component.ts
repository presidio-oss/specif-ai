import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  SimpleChanges,
  OnChanges,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ThinkingProcessConfig,
  defaultConfig,
} from './thinking-process.config';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { ThreeBounceLoaderComponent } from '../three-bounce-loader/three-bounce-loader.component';
import { CustomAccordionComponent } from '../custom-accordion/custom-accordion.component';
import {
  heroSparkles,
  heroCheckCircle,
  heroWrenchScrewdriver,
} from '@ng-icons/heroicons/outline';
import { WorkflowProgressEvent } from '../../model/interfaces/workflow-progress.interface';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  group,
  state,
} from '@angular/animations';

@Component({
  selector: 'app-thinking-process',
  templateUrl: './thinking-process.component.html',
  styleUrls: ['./thinking-process.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    NgIconComponent,
    ThreeBounceLoaderComponent,
    CustomAccordionComponent,
  ],
  providers: [
    provideIcons({
      heroSparkles,
      heroCheckCircle,
      heroWrenchScrewdriver,
    }),
  ],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.96)' }),
        animate(
          '300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'scale(1)' }),
        ),
      ]),
      transition(':leave', [
        animate(
          '240ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 0, transform: 'scale(0.96)' }),
        ),
      ]),
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(10px)' }),
            stagger(70, [
              group([
                animate(
                  '360ms cubic-bezier(0.4, 0, 0.2, 1)',
                  style({ opacity: 1 }),
                ),
                animate(
                  '460ms cubic-bezier(0.4, 0, 0.2, 1)',
                  style({ transform: 'translateY(0)' }),
                ),
              ]),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
    trigger('pulseAnimation', [
      state('active', style({ transform: 'scale(1.05)', opacity: 0.9 })),
      state('inactive', style({ transform: 'scale(1)', opacity: 1 })),
      transition('inactive => active', animate('500ms ease-in')),
      transition('active => inactive', animate('500ms ease-out')),
    ]),
  ],
})
export class ThinkingProcessComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  @Input() progress: WorkflowProgressEvent[] = [];
  @Input() show: boolean = false;
  @Input() config: ThinkingProcessConfig = defaultConfig;

  @ViewChild('logsContainer') private logsContainer?: ElementRef;

  appName = environment.ThemeConfiguration.appName;
  pulseState: 'active' | 'inactive' = 'inactive';
  private pulseInterval?: any;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['progress']?.currentValue?.length > 0) {
      this.scrollToBottom();
    }

    if (changes['show']?.currentValue === true && !this.pulseInterval) {
      this.startPulseAnimation();
    } else if (changes['show']?.currentValue === false && this.pulseInterval) {
      this.stopPulseAnimation();
    }
  }

  ngAfterViewInit() {
    if (this.show) {
      this.startPulseAnimation();
    }
  }

  ngOnDestroy() {
    this.stopPulseAnimation();
  }

  private scrollToBottom(): void {
    if (this.logsContainer) {
      setTimeout(() => {
        requestAnimationFrame(() => {
          const element = this.logsContainer!.nativeElement;
          const scrollOptions = {
            top: element.scrollHeight,
            behavior: 'smooth' as ScrollBehavior,
          };
          element.scrollTo(scrollOptions);
        });
      }, 120);
    }
  }

  private startPulseAnimation(): void {
    this.pulseInterval = setInterval(() => {
      this.pulseState = this.pulseState === 'active' ? 'inactive' : 'active';
    }, 2000);
  }

  private stopPulseAnimation(): void {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = undefined;
    }
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

  hasInputOutput(event: WorkflowProgressEvent): boolean {
    return (
      (event.type === 'mcp' || event.type === 'action') &&
      (!!event.message.input || !!event.message.output)
    );
  }

  getAccordionId(event: WorkflowProgressEvent, index: number): string {
    return `${event.type}-${index}-${event.timestamp}`;
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
}
