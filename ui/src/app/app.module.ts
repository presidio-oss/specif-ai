import { APP_INITIALIZER, NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxLoadingModule } from 'ngx-loading';
import { NgxSmartModalModule } from 'ngx-smart-modal';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { UtilityService } from './services/utility.service';
import { MatMenuModule } from '@angular/material/menu';
import { ExportService } from './services/export.service';
import { SharedModule } from './modules/shared/shared.module';
import { NgxsModule } from '@ngxs/store';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsFormPluginModule } from '@ngxs/form-plugin';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsRouterPluginModule } from '@ngxs/router-plugin';
import { NgxsStoragePluginModule, StorageOption } from '@ngxs/storage-plugin';
import { ProjectsState } from './store/projects/projects.state';
import { UserStoriesState } from './store/user-stories/user-stories.state';
import { LoadingInterceptor } from './interceptor/http.interceptor';
import { BreadcrumbState } from './store/breadcrumb/breadcrumb.state';
import { FooterComponent } from './components/layout/footer/footer.component';
import { BusinessProcessState } from './store/business-process/business-process.state';
import { MatDialogModule } from '@angular/material/dialog';
import * as Sentry from '@sentry/angular';
import { Router } from '@angular/router';
import { LLMConfigState } from './store/llm-config/llm-config.state';
import { NgIconsModule } from '@ng-icons/core';
import { NgOptimizedImage } from '@angular/common';
import { AppComponent } from './app.component';
import { ToasterComponent } from './components/toaster/toaster.component';
import { HeaderComponent } from './components/layout/header/header.component';
import { LoadingComponent } from './components/core/loading/loading.component';
import { AlertComponent } from './components/core/alert/alert.component';
import { environment } from '../environments/environment';
import { MatSelectModule } from '@angular/material/select';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions } from '@angular/material/tooltip';
import { ChatSettingsState } from './store/chat-settings/chat-settings.state';
import { Title } from '@angular/platform-browser';
import { InputFieldComponent } from './components/core/input-field/input-field.component';
import { ButtonComponent } from './components/core/button/button.component';
import { AuthService } from './services/auth/auth.service';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { AuthStateService } from './services/auth/auth-state.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    NgxLoadingModule.forRoot({}),
    NgxSmartModalModule.forRoot(),
    MatProgressBarModule,
    BrowserAnimationsModule,
    MatMenuModule,
    MatDialogModule,
    MatSelectModule,
    MatBadgeModule,
    SharedModule,
    FormsModule,
    NgxsModule.forRoot(
      [
        ProjectsState,
        UserStoriesState,
        BreadcrumbState,
        BusinessProcessState,
        LLMConfigState,
        ChatSettingsState,
      ],
      {
        developmentMode: environment.DEBUG_MODE,
      },
    ),
    NgxsReduxDevtoolsPluginModule.forRoot({
      disabled: !environment.DEBUG_MODE,
    }),
    NgxsFormPluginModule.forRoot(),
    NgxsLoggerPluginModule.forRoot({
      disabled: !environment.DEBUG_MODE,
      collapsed: environment.DEBUG_MODE,
    }),
    NgxsRouterPluginModule.forRoot(),
    NgxsStoragePluginModule.forRoot({
      keys: '*',
      storage: StorageOption.LocalStorage,
    }),
    NgIconsModule,
    NgOptimizedImage,
    ToasterComponent,
    FooterComponent,
    HeaderComponent,
    LoadingComponent,
    AlertComponent,
    MatSnackBarModule,
    InputFieldComponent,
    ButtonComponent,
  ],
  providers: [
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useValue: {
        position: 'below',
        showDelay: 500,
        hideDelay: 500
      } as MatTooltipDefaultOptions
    },
    AuthStateService,
    AuthService,
    UtilityService,
    ExportService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler(),
    },
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
    {
      provide: APP_INITIALIZER,
      deps: [Sentry.TraceService],
      multi: true,
      useFactory: () => () => {}
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private titleService: Title) {
    this.titleService.setTitle(environment.ThemeConfiguration.appName);
  }
}
