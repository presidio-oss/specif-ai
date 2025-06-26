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
    return `border border-indigo-200`;
  }

  getIconBgClass(): string {
    return `bg-indigo-100 border border-indigo-200`;
  }

  getTextColorClass(): string {
    return `text-indigo-600`;
  }
}
