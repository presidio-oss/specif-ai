import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { Router, RouterLink } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { ButtonComponent } from '../../components/core/button/button.component';
import { TimeZonePipe } from '../../pipes/timezone-pipe';
import { ElectronService } from '../../electron-bridge/electron.service';
import { SolutionService } from '../../services/solution-service/solution-service.service';
import { IProject } from '../../model/interfaces/projects.interface';

@Component({
  selector: 'app-apps',
  templateUrl: './apps.component.html',
  styleUrls: ['./apps.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    ButtonComponent,
    RouterLink,
    NgForOf,
    TimeZonePipe,
  ],
})
export class AppsComponent implements OnInit {
  store = inject(Store);
  route = inject(Router);
  electronService = inject(ElectronService);
  solutionService = inject(SolutionService);

  solutions: IProject[] = [];

  async navigateToApp(data: any) {
    try {
      // Activate solution database before navigation
      await this.electronService.activateSolution(data.name);
      
      // Proceed with navigation
      await this.route.navigate([`apps/${data.id}`], {
        state: {
          data,
          breadcrumb: {
            name: data.name,
            link: '/',
            icon: '',
          },
        },
      });
    } catch (error) {
      console.error('Error activating solution:', error);
      throw error;
    }
  }

  navigateToCreate() {
    this.route.navigate(['/apps/create']);
  }

  async ngOnInit() {
    try {
      this.solutions = await this.solutionService.getSolutions();
      this.store.dispatch(new AddBreadcrumbs([]));
    } catch (error) {
      console.error('Error loading solutions:', error);
    }
  }
}
