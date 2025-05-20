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
import { NgIf, NgFor } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCpuChip, heroSquare3Stack3d } from '@ng-icons/heroicons/outline';
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
  imports: [NgIf, NgFor, NgIconComponent],
  providers: [
    provideIcons({
      heroCpuChip,
      heroSquare3Stack3d,
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
  @Input() thinkingLogs: string[] = [];
  @Input() actionsTaken: string[] = [];
  @Input() show: boolean = false;
  @Input() config: ThinkingProcessConfig = defaultConfig;

  @ViewChild('logsContainer') private logsContainer?: ElementRef;
  @ViewChild('actionsContainer') private actionsContainer?: ElementRef;

  appName = environment.ThemeConfiguration.appName;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['thinkingLogs'] && this.thinkingLogs.length > 0) {
      this.scrollToBottom('thinking');
    }
    if (changes['actionsTaken'] && this.actionsTaken.length > 0) {
      this.scrollToBottom('actions');
    }
  }

  private scrollToBottom(type: 'thinking' | 'actions'): void {
    const container =
      type === 'thinking' ? this.logsContainer : this.actionsContainer;
    if (container) {
      setTimeout(() => {
        requestAnimationFrame(() => {
          const element = container!.nativeElement;
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
