import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Router } from '@angular/router';
import { ElectronService } from './services/electron/electron.service';
import { AuthService } from './services/auth/auth.service';
import { Store } from '@ngxs/store';
import { LLMConfigState } from './store/llm-config/llm-config.state';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  electronService = inject(ElectronService);
  logger = inject(NGXLogger);
  router = inject(Router);
  authService = inject(AuthService);
  store = inject(Store);

  private authSubscription: Subscription | null = null;

  ngOnInit() {
    if (sessionStorage.getItem('serverActive') !== 'true') {
      this.electronService
        .listenPort()
        .then(() => {
          // Success logic if needed
        })
        .catch((error) => {
          this.logger.error('Error listening to port', error);
          alert('An error occurred while trying to listen to the port.');
        });
    }

    this.initializeLLMConfig();

    this.authSubscription = this.authService.isLoggedIn$.subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.initializeLLMConfig();
      }
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private initializeLLMConfig() {
    this.logger.debug('Initializing LLM configuration');
    if (this.authService.isAuthenticated()) {
      this.authService.initializeLLMConfig().subscribe({
        next: () => this.logger.debug('LLM configuration initialized successfully'),
        error: (error) => this.logger.error('Error initializing LLM configuration', error)
      });
    } else {
      this.logger.debug('User not authenticated, skipping LLM configuration initialization');
    }
  }
}
