import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { StartupService } from '../../services/auth/startup.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { Router } from '@angular/router';
import { ElectronService } from '../../electron-bridge/electron.service';
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
    directoryPath: new FormControl(
      { value: '', disabled: true },
      Validators.required,
    ),
  });

  themeConfiguration = environment.ThemeConfiguration;

  startupService = inject(StartupService);
  toastService = inject(ToasterService);
  routerService = inject(Router);
  electronService = inject(ElectronService);
  logger = inject(NGXLogger);

  async ngOnInit() {
    this.startupService.setIsLoggedIn(false);
    const config =
      (await this.electronService.getStoreValue('APP_CONFIG')) || {};

    const username = config.username || localStorage.getItem(APP_CONSTANTS.USER_NAME);
    const directoryPath =
      config.directoryPath || localStorage.getItem(APP_CONSTANTS.WORKING_DIR);

    this.loginForm.patchValue({
      username: username as string,
      directoryPath: directoryPath as string,
    });

    if (this.loginForm.valid) {
      // Auto-login if values are present in localStorage
      if (localStorage.getItem(APP_CONSTANTS.USER_NAME)) {
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
    const { username } = this.loginForm.getRawValue() as {
      username: string;
    };
      const electronStoreValue = await this.electronService.getStoreValue('APP_CONFIG');
      let userId = electronStoreValue?.userId;
      if (!userId) {
        userId = uuidv4();
      }

      const newConfig = {
        ...electronStoreValue,
        userId: userId,
        username: username,
        directoryPath: this.loginForm.get('directoryPath')!.value,
      };

      this.electronService.setStoreValue('APP_CONFIG', newConfig);
      localStorage.setItem(
        APP_CONSTANTS.WORKING_DIR,
        newConfig.directoryPath as string,
      );
      localStorage.setItem(APP_CONSTANTS.USER_NAME, username as string);
      localStorage.setItem(APP_CONSTANTS.USER_ID, userId as string);

      this.startupService.setIsLoggedIn(true);
      this.routerService
        .navigate(['/apps'])
        .catch((err) => this.logger.error(err));
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
