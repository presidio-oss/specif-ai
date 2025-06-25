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
  @Input() color: string = 'purple'; 
  @Input() percentage: number | null = null;

  getBackgroundClass(): string {
    return `border border-${this.color}-200`;
  }

  getIconBgClass(): string {
    return `bg-${this.color}-100 border border-${this.color}-200`;
  }

  getTextColorClass(): string {
    return `text-${this.color}-600`;
  }
}
