import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { WorkflowType } from '../../../model/interfaces/workflow-progress.interface';
import { WorkflowProgressComponent } from '../workflow-progress.component';
import { ButtonComponent } from '../../core/button/button.component';

@Component({
  selector: 'app-workflow-progress-dialog',
  templateUrl: './workflow-progress-dialog.component.html',
  styleUrls: ['./workflow-progress-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, NgClass, WorkflowProgressComponent, ButtonComponent],
})
export class WorkflowProgressDialogComponent {
  @Input() isVisible: boolean = false;
  @Input() projectId!: string;
  @Input() workflowType!: WorkflowType;
  @Input() isCompleted: boolean = false;
  @Input() initialTitle: string = '';
  @Input() completedTitle: string = '';
  @Input() subtitle: string = '';
  @Input() completionButtonText: string = '';
  @Input() showCancelButton: boolean = false;

  @Output() closeDialog = new EventEmitter<void>();

  onCloseDialog(): void {
    this.closeDialog.emit();
  }
}
