import { Component, inject, OnInit } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { BreadcrumbState } from '../../../store/breadcrumb/breadcrumb.state';
import { IBreadcrumb } from '../../../model/interfaces/projects.interface';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowLeft, heroHome } from '@ng-icons/heroicons/outline';
import { Location } from '@angular/common';

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
  viewProviders: [provideIcons({ heroArrowLeft, heroHome })],
})
// TODO: Validate updated breadcrumb component thoroughly in all flows
export class BreadcrumbsComponent implements OnInit {
  store = inject(Store);
  router = inject(Router);
  location = inject(Location);

  breadcrumbs$ = this.store.select(BreadcrumbState.getBreadcrumbs);

  pageHistory: IBreadcrumb[] = [];

  ngOnInit() {
    this.breadcrumbs$.subscribe((pages) => {
      this.pageHistory = [{ label: 'Apps', url: '/apps' }, ...pages];
    });
  }

  navigateTo(breadcrumb: IBreadcrumb) {
    if (breadcrumb.url) {
      this.router.navigate([breadcrumb.url]);
    }
  }

  navigateToPreviousPage() {
    this.location.back();
  }
}
