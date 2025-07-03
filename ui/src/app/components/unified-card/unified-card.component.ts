import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  heroDocumentDuplicate, 
  heroBeaker, 
  heroArrowTrendingUp, 
  heroArrowRight, 
  heroArrowTrendingDown,
  heroClipboardDocumentCheck,
  heroExclamationCircle,
  heroCheckCircle
} from '@ng-icons/heroicons/outline';
import { ButtonComponent } from '../core/button/button.component';
import { BadgeComponent } from '../core/badge/badge.component';

export interface CardBadge {
  text: string;
  bgClass: string;
  textClass: string;
}

export interface CardStatusIndicator {
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
  text: string;
  textColorClass?: string;
  tooltip?: string;
}

@Component({
  selector: 'app-unified-card',
  standalone: true,
  imports: [
    CommonModule,
    NgIconComponent,
    MatTooltipModule,
    ButtonComponent,
    BadgeComponent
  ],
  providers: [
    provideIcons({
      heroDocumentDuplicate,
      heroBeaker,
      heroArrowTrendingUp,
      heroArrowRight,
      heroArrowTrendingDown,
      heroClipboardDocumentCheck,
      heroExclamationCircle,
      heroCheckCircle
    })
  ],
  templateUrl: './unified-card.component.html'
})
export class UnifiedCardComponent {
  // Card content
  @Input() id: string = '';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() borderClass: string = '';
  
  // Status indicator (left side of footer)
  @Input() statusIndicator?: CardStatusIndicator;
  
  // Additional badges (shown after status indicator)
  @Input() badges: CardBadge[] = [];
  
  // Action button (right side of footer)
  @Input() actionButtonText: string = 'View Details';
  
  // Copy button tooltip
  @Input() copyTooltip: string = 'Copy content';
  
  // Events
  @Output() viewItem = new EventEmitter<void>();
  @Output() copyContent = new EventEmitter<Event>();
  
  /**
   * Truncates a string to a specified length and adds ellipsis if needed
   */
  truncateText(text: string | undefined, maxLength: number = 150): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  /**
   * Emits event when card is clicked
   */
  onViewItem(): void {
    this.viewItem.emit();
  }
  
  /**
   * Emits event when copy button is clicked
   */
  onCopyContent(event: Event): void {
    event.stopPropagation();
    this.copyContent.emit(event);
  }
}
