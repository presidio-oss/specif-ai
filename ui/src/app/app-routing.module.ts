import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppInfoComponent } from './pages/app-info/app-info.component';
import { AppsComponent } from './pages/apps/apps.component';
import { CreateSolutionComponent } from './pages/create-solution/create-solution.component';
import { EditSolutionComponent } from './pages/edit-solution/edit-solution.component';
import { UserStoriesComponent } from './pages/user-stories/user-stories.component';
import { AddTaskComponent } from './pages/tasks/add-task/add-task.component';
import { EditUserStoriesComponent } from './pages/edit-user-stories/edit-user-stories.component';
import { TaskListComponent } from './pages/tasks/task-list/task-list.component';
import { BusinessProcessComponent } from './pages/business-process/business-process.component';
import { UserGuard } from './guards/auth.guard';
import { BusinessProcessFlowComponent } from './pages/business-process-flow/business-process-flow.component';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { LoginComponent } from './pages/login/login.component';
import { SettingsComponent } from './components/settings/settings.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'apps/create',
    component: CreateSolutionComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
    data: {
      breadcrumb: {
        name: 'Create Solution',
        link: '/apps',
        icon: 'add',
      },
    },
  },
  {
    path: 'apps/:id',
    component: AppInfoComponent,
    canActivate: [UserGuard],
    data: {
      breadcrumb: {
        link: '/apps',
        icon: 'add',
      },
    },
  },
  { path: 'apps', component: AppsComponent, canActivate: [UserGuard] },
  {
    path: 'user-stories/:prdId',
    component: UserStoriesComponent,
    canActivate: [UserGuard],
  },
  {
    path: 'task-list/:userStoryId',
    component: TaskListComponent,
    canActivate: [UserGuard],
  },
  {
    path: 'task/:mode/:userStoryId',
    component: AddTaskComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'task/:mode/:userStoryId/:taskId',
    component: AddTaskComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'story/:mode',
    component: EditUserStoriesComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'story/:mode/:userStoryId',
    component: EditUserStoriesComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'edit',
    component: EditSolutionComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'add/:documentTypeId/:solutionId',
    component: EditSolutionComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'bp-add',
    component: BusinessProcessComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'bp-edit',
    component: BusinessProcessComponent,
    canActivate: [UserGuard],
    canDeactivate: [CanDeactivateGuard],
  },
  {
    path: 'bp-flow/:mode/:id',
    component: BusinessProcessFlowComponent,
    canActivate: [UserGuard],
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [UserGuard],
    data: {
      breadcrumb: {
        name: 'Settings',
        icon: 'settings',
      },
    },
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      paramsInheritanceStrategy: 'always',
      useHash: true,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
