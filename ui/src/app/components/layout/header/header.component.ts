import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StartupService } from '../../../services/auth/startup.service';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { BreadcrumbsComponent } from '../../core/breadcrumbs/breadcrumbs.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { heroCog8Tooth } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    NgIconComponent,
    NgIf,
    RouterLink,
    AsyncPipe,
    MatTooltipModule,
  ],
  viewProviders: [provideIcons({ heroCog8Tooth })]
})
export class HeaderComponent {
  protected themeConfiguration = environment.ThemeConfiguration;

  startupService = inject(StartupService);
  router = inject(Router);

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }
}
