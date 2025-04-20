import { Component, inject, OnInit } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { BreadcrumbState } from '../../../store/breadcrumb/breadcrumb.state';
import { IBreadcrumb } from '../../../model/interfaces/projects.interface';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowLeft, heroHome } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-breadcrumbs',
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    NgIconComponent,
    NgForOf,
    NgIf,
    AsyncPipe,
    MatTooltipModule,
  ],
  viewProviders: [provideIcons({ heroArrowLeft, heroHome })]
})
export class BreadcrumbsComponent implements OnInit {
  pageHistory: IBreadcrumb[] = [];

  store = inject(Store);
  router = inject(Router);

  breadcrumbs$ = this.store.select(BreadcrumbState.getBreadcrumbs);

  ngOnInit() {
    this.breadcrumbs$.subscribe((pages) => {
      this.pageHistory = [{ label: 'Apps', url: '/apps', state: {} }, ...pages];
    });
  }

  navigateTo(breadcrumb: IBreadcrumb) {
    if (breadcrumb.url) {
      this.router
        .navigate(
          [breadcrumb.url],
          breadcrumb.state
            ? {
              state: breadcrumb.state,
            }
            : undefined,
        )
        .then();
    }
  }

  navigateToPreviousPage() {
    if (this.pageHistory.length > 1) {
      const previousPage = this.pageHistory[this.pageHistory.length - 2];
      if (previousPage.url) {
        this.router.navigate([previousPage.url], {
          state: previousPage.state || {},
        });
      }
    } else {
      console.log('No previous page to navigate to.');
    }
  }
}
