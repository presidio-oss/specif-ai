import { Component, inject, Input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { heroInformationCircle } from '@ng-icons/heroicons/outline';
import { ElectronService } from 'src/app/electron-bridge/electron.service';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  standalone: true,
  imports: [NgIcon, CommonModule],
  providers: [provideIcons({ heroInformationCircle })],
})
export class BadgeComponent {
  @Input() badgeText!: string | number;
  @Input() class?: string;
  @Input() infoLink?: string;
  electronService = inject(ElectronService);
}
