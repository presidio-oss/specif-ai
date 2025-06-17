import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import {
  NgIf,
  NgFor,
  NgClass,
  AsyncPipe,
  NgTemplateOutlet,
} from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSparkles,
  heroCheckCircle,
  heroWrenchScrewdriver,
  heroStopCircle,
  heroChevronDoubleUp,
  heroChevronDoubleDown,
} from '@ng-icons/heroicons/outline';
import {
  WorkflowProgressEvent,
  WorkflowProgressEventType,
  WorkflowType,
  WorkflowStatus,
} from '../../model/interfaces/workflow-progress.interface';
import { CustomAccordionComponent } from '../custom-accordion/custom-accordion.component';
import { ButtonComponent } from '../core/button/button.component';
import { WorkflowProgressService } from '../../services/workflow-progress/workflow-progress.service';
import { DialogService } from '../../services/dialog/dialog.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { Observable, Subject, takeUntil, map, combineLatest } from 'rxjs';

interface ProcessedProgressEvent extends WorkflowProgressEvent {
  hasInputOutput: boolean;
  shouldShowSpinner: boolean;
  iconName: string;
  colorClass: string;
  textColorClass: string;
  borderColorClass: string;
  formattedInput?: string;
  formattedOutput?: string;
  accordionId: string;
}

@Component({
  selector: 'app-workflow-progress',
  templateUrl: './workflow-progress.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    AsyncPipe,
    NgIconComponent,
    CustomAccordionComponent,
    ButtonComponent,
    NgTemplateOutlet,
  ],
  providers: [
    provideIcons({
      heroSparkles,
      heroCheckCircle,
      heroWrenchScrewdriver,
      heroStopCircle,
      heroChevronDoubleUp,
      heroChevronDoubleDown,
    }),
  ],
})
export class WorkflowProgressComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;
  @Input() workflowType!: WorkflowType;
  @Input() isVisible: boolean = false;
  @Input() isCompleted: boolean = false;
  @Input() initialTitle: string = 'Creating Solution...';
  @Input() subtitle: string = 'Relax while SpecifAI takes care of the rest...';
  @Input() completedTitle: string = 'Process Completed Successfully!';
  @Input() maxHeight: string = 'none';
  @Input() showCancelButton: boolean = true;
  @Input() showHeader: boolean = true;

  processedProgress$!: Observable<ProcessedProgressEvent[]>;
  workflowStatus$!: Observable<WorkflowStatus>;
  hasAnyAccordionEvents$!: Observable<boolean>;

  isAborting = signal(false);
  isExpandedAll = signal(false);

  readonly WorkflowProgressEventType = WorkflowProgressEventType;
  private destroy$ = new Subject<void>();

  private readonly eventConfig = {
    [WorkflowProgressEventType.Thinking]: {
      iconName: 'heroSparkles',
      colorClass: 'bg-primary-400',
      textColorClass: 'text-primary-700',
      borderColorClass: 'border-primary-500',
    },
    [WorkflowProgressEventType.Action]: {
      iconName: 'heroCheckCircle',
      colorClass: 'bg-success-400',
      textColorClass: 'text-success-700',
      borderColorClass: 'border-success-500',
    },
    [WorkflowProgressEventType.Mcp]: {
      iconName: 'heroWrenchScrewdriver',
      colorClass: 'bg-amber-400',
      textColorClass: 'text-amber-700',
      borderColorClass: 'border-amber-500',
    },
  };

  constructor(
    private workflowProgressService: WorkflowProgressService,
    private dialogService: DialogService,
    private toasterService: ToasterService,
  ) {}

  ngOnInit(): void {
    if (this.projectId && this.workflowType) {
      const progress$ = this.workflowType === WorkflowType.Story
        ? combineLatest([
            this.workflowProgressService.getProgressEvents$(this.projectId, WorkflowType.Story),
            this.workflowProgressService.getProgressEvents$(this.projectId, WorkflowType.Task)
          ]).pipe(
            map(([storyEvents, taskEvents]) => {
              return [...storyEvents, ...taskEvents].sort((a, b) => a.timestamp - b.timestamp);
            })
          )
        : this.workflowProgressService.getProgressEvents$(
            this.projectId,
            this.workflowType,
          );

      this.workflowStatus$ =
        this.workflowProgressService.getCreationStatusObservable(
          this.projectId,
          this.workflowType,
        );

      this.processedProgress$ = combineLatest([
        progress$,
        this.workflowStatus$,
      ]).pipe(
        map(([events, status]) => this.processProgressEvents(events, status)),
      );

      this.hasAnyAccordionEvents$ = this.processedProgress$.pipe(
        map((events) => events.some((event) => event.hasInputOutput)),
      );

      this.workflowStatus$
        .pipe(takeUntil(this.destroy$))
        .subscribe((status) => {
          if (!status.isCreating) {
            this.isAborting.set(false);
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private processProgressEvents(
    events: WorkflowProgressEvent[],
    status: WorkflowStatus,
  ): ProcessedProgressEvent[] {
    return events.map((event, index) => {
      const config = this.eventConfig[event.type];
      const hasInputOutput = this.checkHasInputOutput(event);

      return {
        ...event,
        hasInputOutput,
        shouldShowSpinner: this.calculateShouldShowSpinner(
          event,
          events,
          status.isCreating,
        ),
        iconName: config.iconName,
        colorClass: config.colorClass,
        textColorClass: config.textColorClass,
        borderColorClass: config.borderColorClass,
        formattedInput:
          hasInputOutput && event.message?.input
            ? this.formatData(event.message.input)
            : undefined,
        formattedOutput:
          hasInputOutput && event.message?.output
            ? this.formatData(event.message.output)
            : undefined,
        accordionId: `progress-${event.type}-${index}-${event.timestamp}`,
      };
    });
  }

  private checkHasInputOutput(event: WorkflowProgressEvent): boolean {
    return (
      (event.type === WorkflowProgressEventType.Mcp ||
        event.type === WorkflowProgressEventType.Action) &&
      (!!event.message?.input || !!event.message?.output)
    );
  }

  private calculateShouldShowSpinner(
    event: WorkflowProgressEvent,
    progress: WorkflowProgressEvent[],
    isCreating: boolean,
  ): boolean {
    if (
      event.type === WorkflowProgressEventType.Action ||
      event.type === WorkflowProgressEventType.Mcp ||
      this.isCompleted ||
      !isCreating
    ) {
      return false;
    }

    if (event.correlationId) {
      return event.type === WorkflowProgressEventType.Thinking;
    }

    const currentIndex = progress.indexOf(event);
    let lastActionIndex = -1;

    for (let i = progress.length - 1; i >= 0; i--) {
      if (progress[i].type === WorkflowProgressEventType.Action) {
        lastActionIndex = i;
        break;
      }
    }

    return currentIndex > lastActionIndex;
  }

  private formatData(data: any): string {
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

  onCancelClick(): void {
    if (this.isAborting()) {
      return;
    }

    this.dialogService
      .confirm({
        title: 'Cancel Process',
        description: `Are you sure you want to cancel the ${this.workflowType} creation process? This action cannot be undone.`,
        confirmButtonText: 'Yes, Cancel',
        cancelButtonText: 'No, Continue',
      })
      .subscribe((result: boolean) => {
        if (result) {
          this.cancelWorkflow();
        }
      });
  }

  private async cancelWorkflow(): Promise<void> {
    this.isAborting.set(true);

    try {
      const success = await this.workflowProgressService.abortWorkflow(
        this.projectId,
        this.workflowType,
      );

      if (!success) {
        this.toasterService.showWarning(
          `Unable to cancel ${this.workflowType} creation. The process may have already completed.`,
        );
      }
    } catch (error) {
      console.error(`Error cancelling ${this.workflowType} creation:`, error);
      this.toasterService.showError(
        `An error occurred while cancelling ${this.workflowType} creation. Please try again.`,
      );
    } finally {
      this.isAborting.set(false);
    }
  }

  toggleExpandAll(): void {
    this.isExpandedAll.update((value) => !value);
  }

  shouldAccordionBeOpen(): boolean {
    return this.isExpandedAll();
  }
}
