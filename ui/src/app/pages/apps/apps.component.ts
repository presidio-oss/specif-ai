import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { GetProjectListAction } from '../../store/projects/projects.actions';
import { Router, RouterLink } from '@angular/router';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent } from '../../components/core/button/button.component';
import { TimeZonePipe } from '../../pipes/timezone-pipe';

interface RecentSolution {
  id: string;
  name: string;
  lastAccessed: Date;
}

@Component({
  selector: 'app-apps',
  templateUrl: './apps.component.html',
  styleUrls: ['./apps.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    ButtonComponent,
    RouterLink,
    AsyncPipe,
    NgForOf,
    TimeZonePipe,
  ],
})
export class AppsComponent implements OnInit {
  store = inject(Store);
  route = inject(Router);

  projectList$ = this.store.select(ProjectsState.getProjects);
  recentSolutions: RecentSolution[] = [];

  navigateToApp(data: any) {
    this.updateRecentSolutions(data);

    this.route
      .navigate([`apps/${data.id}`], {
        state: {
          data,
          breadcrumb: {
            name: data.name,
            link: '/',
            icon: '',
          },
        },
      })
      .then();
  }

  navigateToCreate() {
    this.route.navigate(['/apps/create']);
  }

  private updateRecentSolutions(solution: any) {
    const recentSolution: RecentSolution = {
      id: solution.id,
      name: solution.name || 'Unnamed Solution',
      lastAccessed: new Date()
    };

    this.recentSolutions = this.recentSolutions.filter(s => s.id !== solution.id);

    this.recentSolutions.unshift(recentSolution);

    this.recentSolutions = this.recentSolutions.slice(0, 5);

    localStorage.setItem('recentSolutions', JSON.stringify(this.recentSolutions));
  }

  private loadRecentSolutions() {
    const stored = localStorage.getItem('recentSolutions');
    if (stored) {
      this.recentSolutions = JSON.parse(stored);
      this.recentSolutions.forEach(solution => {
        solution.lastAccessed = new Date(solution.lastAccessed);
      });
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }

  ngOnInit() {
    this.store.dispatch(new AddBreadcrumbs([]));
    this.store.dispatch(new GetProjectListAction());
    this.loadRecentSolutions();
  }
}
