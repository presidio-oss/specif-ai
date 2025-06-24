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
  @Input() color: 'blue' | 'green' | 'purple' | 'amber' | 'red' = 'purple';
  @Input() percentage: number | null = null;
  
  /**
   * Get the background gradient class based on the color
   */
  getBackgroundClass(): string {
    return `bg-gradient-to-br from-${this.color}-50 to-${this.color}-100 border border-${this.color}-200`;
  }
  
  /**
   * Get the icon background class based on the color
   */
  getIconBgClass(): string {
    return `bg-${this.color}-100 border border-${this.color}-200`;
  }
  
  /**
   * Get the text color class based on the color
   */
  getTextColorClass(): string {
    return `text-${this.color}-600`;
  }
  
  /**
   * Get the heading text color class based on the color
   */
  getHeadingColorClass(): string {
    return `text-${this.color}-700`;
  }
  
  /**
   * Get the progress bar background class based on the color
   */
  getProgressBgClass(): string {
    return `bg-${this.color}-200`;
  }
  
  /**
   * Get the progress bar fill class based on the color
   */
  getProgressFillClass(): string {
    return `bg-${this.color}-600`;
  }
}
