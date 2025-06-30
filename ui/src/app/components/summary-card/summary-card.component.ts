import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent
  ],
  templateUrl: './summary-card.component.html'
})
export class SummaryCardComponent {
  @Input() icon: string = '';
  @Input() count: number = 0;
  @Input() title: string = '';
  @Input() color?: string = 'indigo'; 
  @Input() percentage: number | null = null;

  getBackgroundClass(): string {
    return `border border-gray-200`;
  }

  getIconBgClass(): string {
    switch (this.color) {
      case 'primary':
        return `bg-primary-100 border border-primary-200`;
      case 'success':
        return `bg-success-100 border border-success-200`;
      case 'danger':
        return `bg-danger-100 border border-danger-200`;
      case 'warning':
        return `bg-warning-100 border border-warning-200`;
      case 'secondary':
        return `bg-secondary-100 border border-secondary-200`;
      default:
        return `bg-primary-100 border border-primary-200`;
    }
  }

  getTextColorClass(): string {
    switch (this.color) {
      case 'primary':
        return `text-primary-600`;
      case 'success':
        return `text-success-600`;
      case 'danger':
        return `text-danger-600`;
      case 'warning':
        return `text-warning-600`;
      case 'secondary':
        return `text-secondary-600`;
      default:
        return `text-primary-600`;
    }
  }
}
