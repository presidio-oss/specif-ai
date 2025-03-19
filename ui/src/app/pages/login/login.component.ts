import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { Router } from '@angular/router';
import { ElectronService } from '../../services/electron/electron.service';
import { NGXLogger } from 'ngx-logger';
import { APP_CONSTANTS } from '../../constants/app.constants';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { ErrorMessageComponent } from '../../components/core/error-message/error-message.component';
import { environment } from '../../../environments/environment';
import { NgIf } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    InputFieldComponent,
    ReactiveFormsModule,
    ButtonComponent,
    ErrorMessageComponent,
  ],
})
export class LoginComponent implements OnInit {
  loginForm = new FormGroup({
    username: new FormControl('', Validators.required),
    appUrl: new FormControl('', Validators.required),
    passcode: new FormControl('', Validators.required),
    directoryPath: new FormControl(
      { value: '', disabled: true },
      Validators.required,
    ),
  });

  themeConfiguration = environment.ThemeConfiguration;

  authService = inject(AuthService);
  toastService = inject(ToasterService);
  routerService = inject(Router);
  electronService = inject(ElectronService);
  logger = inject(NGXLogger);

  async ngOnInit() {
    this.authService.setIsLoggedIn(false);
    const config =
      (await this.electronService.getStoreValue('APP_CONFIG')) || {};

    const appUrl = config.appUrl || localStorage.getItem(APP_CONSTANTS.APP_URL);
    const username = config.username || localStorage.getItem(APP_CONSTANTS.USER_NAME);
    const passcode =
      config.password || localStorage.getItem(APP_CONSTANTS.APP_PASSCODE_KEY);
    const directoryPath =
      config.directoryPath || localStorage.getItem(APP_CONSTANTS.WORKING_DIR);

    if (appUrl && passcode && username) {
      this.loginForm.patchValue({
        appUrl: appUrl as string,
        passcode: atob(passcode as string),
        username: username as string,
        directoryPath: directoryPath as string,
      });

      // Auto-login if values are present in localStorage
      if (
        localStorage.getItem(APP_CONSTANTS.USER_NAME) &&
        localStorage.getItem(APP_CONSTANTS.APP_URL) &&
        localStorage.getItem(APP_CONSTANTS.APP_PASSCODE_KEY)
      ) {
        await this.login();
      }
    }
  }

  async login() {
    this.loginForm.markAllAsTouched();
    const username = this.loginForm.get('username')?.value?.trim();
    if (!username) {
      this.toastService.showError('Username is invalid.');
      this.loginForm.get('username')?.setValue('');
      return;
    }
    if (this.loginForm.valid) {
      const { appUrl, passcode, username } = this.loginForm.getRawValue() as {
        appUrl: string;
        passcode: string;
        username: string;
      };
      const updatedAppUrl = appUrl.trim().replace(/\/+$/, '');
      const electronStoreValue = await this.electronService.getStoreValue('APP_CONFIG');
      let userId = electronStoreValue?.userId;
      if (!userId) {
        userId = uuidv4();
      }

      const newConfig = {
        userId: userId,
        appUrl: updatedAppUrl,
        username: username,
        password: btoa(passcode),
        directoryPath: this.loginForm.get('directoryPath')!.value,
      };

      this.electronService.setStoreValue('APP_CONFIG', newConfig);
      localStorage.setItem(APP_CONSTANTS.APP_URL, updatedAppUrl as string);
      localStorage.setItem(
        APP_CONSTANTS.WORKING_DIR,
        newConfig.directoryPath as string,
      );
      localStorage.setItem(APP_CONSTANTS.USER_NAME, username as string);
      localStorage.setItem(APP_CONSTANTS.USER_ID, userId as string);
      this.logger.debug('Login attempt', updatedAppUrl);

      this.authService
        .login({
          appUrl: `${updatedAppUrl}/`,
          passcode: passcode,
        })
        .subscribe({
          next: (res: any) => {
            this.logger.debug('Login successful', res);
            localStorage.setItem(
              APP_CONSTANTS.APP_PASSCODE_KEY,
              btoa(passcode) as string,
            );

            this.authService.setIsLoggedIn(true);
            this.routerService
              .navigate(['/apps'])
              .catch((err) => this.logger.error(err));
          },
          error: (_) => {
            this.authService.setIsLoggedIn(false);
            localStorage.removeItem(APP_CONSTANTS.APP_URL);
            localStorage.removeItem(APP_CONSTANTS.USER_NAME);
            localStorage.removeItem(APP_CONSTANTS.APP_PASSCODE_KEY);
            this.toastService.showError(
              'Your Server URL or passcode is incorrect. Please try again',
            );
          },
        });
    }
  }

  async browseFiles(): Promise<void> {
    try {
      const response = await this.electronService.openDirectory();
      this.logger.debug('response', response);
      if (response.length > 0) {
        this.loginForm.get('directoryPath')!.setValue(response[0]);
        const currentConfig =
          (await this.electronService.getStoreValue('APP_CONFIG')) || {};
        const updatedConfig = { ...currentConfig, directoryPath: response[0] };
        this.electronService.setStoreValue('APP_CONFIG', updatedConfig);
        localStorage.setItem(APP_CONSTANTS.WORKING_DIR, response[0]);
      }
    } catch (error) {
      this.logger.error('Error selecting root directory', error);
    }
  }
}
