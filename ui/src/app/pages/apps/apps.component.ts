import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { GetProjectListAction } from '../../store/projects/projects.actions';
import { Router, RouterLink } from '@angular/router';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { ButtonComponent } from '../../components/core/button/button.component';
import { TimeZonePipe } from '../../pipes/timezone-pipe';
import { ElectronService } from '../../electron-bridge/electron.service';

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
  electronService = inject(ElectronService);

  projectList$ = this.store.select(ProjectsState.getProjects);

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

  ngOnInit() {
    this.store.dispatch(new AddBreadcrumbs([]));
    this.store.dispatch(new GetProjectListAction());
  }
}
