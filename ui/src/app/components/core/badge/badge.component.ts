import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  standalone: true,
})
export class BadgeComponent {
  @Input() badgeText!: string | number;
  @Input() class?: string;
}
