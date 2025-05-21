import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ThinkingProcessConfig,
  defaultConfig,
} from './thinking-process.config';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroSparkles, heroCheckCircle, heroWrenchScrewdriver } from '@ng-icons/heroicons/outline';
import { WorkflowProgressEvent } from '../../model/interfaces/workflow-progress.interface';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  group,
} from '@angular/animations';

@Component({
  selector: 'app-thinking-process',
  templateUrl: './thinking-process.component.html',
  styleUrls: ['./thinking-process.component.scss'],
  standalone: true,
  imports: [NgIf, NgFor, NgClass, NgIconComponent],
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
        style({ opacity: 0, transform: 'scale(0.97)' }),
        animate(
          '250ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'scale(1)' }),
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 0, transform: 'scale(0.97)' }),
        ),
      ]),
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(8px)' }),
            stagger(60, [
              group([
                animate(
                  '300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  style({ opacity: 1 }),
                ),
                animate(
                  '400ms cubic-bezier(0.4, 0, 0.2, 1)',
                  style({ transform: 'translateY(0)' }),
                ),
              ]),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
})
export class ThinkingProcessComponent implements OnChanges {
  @Input() progress: WorkflowProgressEvent[] = [];
  @Input() show: boolean = false;
  @Input() config: ThinkingProcessConfig = defaultConfig;

  @ViewChild('logsContainer') private logsContainer?: ElementRef;

  appName = environment.ThemeConfiguration.appName;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['progress']?.currentValue?.length > 0) {
      this.scrollToBottom();
    }
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
      }, 100);
    }
  }
}
