import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { GetProjectListAction } from '../../store/projects/projects.actions';
import { Router, RouterLink } from '@angular/router';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent } from '../../components/core/button/button.component';
import { TimeZonePipe } from '../../pipes/timezone-pipe';
import { ElectronService } from '../../electron-bridge/electron.service';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { WorkflowProgressService } from '../../services/workflow-progress/workflow-progress.service';
import {
  WorkflowType,
  WorkflowStatus,
} from '../../model/interfaces/workflow-progress.interface';
import { map, Subject, takeUntil, distinctUntilChanged } from 'rxjs';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSparkles,
  heroXMark,
  heroCheckCircle,
} from '@ng-icons/heroicons/outline';

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
    EmptyStateComponent,
    NgIconComponent,
  ],
  providers: [provideIcons({ heroSparkles, heroXMark, heroCheckCircle })],
})
export class AppsComponent implements OnInit, OnDestroy {
  store = inject(Store);
  route = inject(Router);
  electronService = inject(ElectronService);
  workflowProgressService = inject(WorkflowProgressService);

  private destroy$ = new Subject<void>();
  private projectList$ = this.store.select(ProjectsState.getProjects);

  projectsWithStatus$ = this.projectList$.pipe(
    map((projects) => {
      return projects.map((project) => ({
        ...project,
        workflowStatus$: project.metadata?.id
          ? this.workflowProgressService.getCreationStatusObservable(
              project.metadata.id,
              WorkflowType.Solution,
            )
          : null,
      }));
    }),
    distinctUntilChanged((prev, curr) => prev.length === curr.length),
    takeUntil(this.destroy$),
  );

  async navigateToApp(data: any) {
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
      .then(async () => {
        // Call setMCPProjectId with the project ID
        await this.electronService.setMCPProjectId(data.id);
      });
  }

  navigateToCreate() {
    this.route.navigate(['/apps/create']);
  }

  getBadgeConfig(
    status: WorkflowStatus | null,
  ): { text: string; classes: string; icon: string } | null {
    if (!status) {
      return null;
    }

    if (status.isCreating) {
      return {
        text: 'Creating...',
        classes: 'text-blue-700 bg-blue-50 ring-blue-600/20',
        icon: 'heroSparkles',
      };
    }

    if (status.isFailed) {
      return {
        text: 'Failed',
        classes: 'text-red-700 bg-red-50 ring-red-600/20',
        icon: 'heroXMark',
      };
    }

    if (status.isComplete) {
      return {
        text: 'Ready',
        classes: 'text-success-700 bg-success-50 ring-success-600/20',
        icon: 'heroCheckCircle',
      };
    }

    return null;
  }

  ngOnInit() {
    this.store.dispatch(new AddBreadcrumbs([]));
    this.store.dispatch(new GetProjectListAction());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
