import { Component, inject } from '@angular/core';
import { APP_CONSTANTS } from '../../../constants/app.constants';
import { SelectRootDirectoryComponent } from '../../select-root-directory/select-root-directory.component';
import { MatDialog } from '@angular/material/dialog';
import { ElectronService } from '../../../services/electron/electron.service';
import { NGXLogger } from 'ngx-logger';
import { Router, RouterLink } from '@angular/router';
import { SettingsComponent } from '../../settings/settings.component';
import { AuthService } from '../../../services/auth/auth.service';
import { environment } from '../../../../environments/environment';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { BreadcrumbsComponent } from '../../core/breadcrumbs/breadcrumbs.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  heroArrowRightOnRectangle,
  heroCog8Tooth,
  heroFolder,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    NgIconComponent,
    NgIf,
    RouterLink,
    AsyncPipe,
    MatTooltipModule,
  ],
  viewProviders: [
    provideIcons({ heroCog8Tooth, heroFolder, heroArrowRightOnRectangle }),
  ],
})
export class HeaderComponent {
  protected themeConfiguration = environment.ThemeConfiguration;

  authService = inject(AuthService);
  electronService = inject(ElectronService);
  logger = inject(NGXLogger);
  dialog = inject(MatDialog);
  router = inject(Router);

  /**
   * Prompts the user to select a root directory, saves the selected directory to local storage,
   * and navigates to the '/apps' route or reloads the current page based on the current URL.
   *
   * @return {Promise<void>} A promise that resolves when the directory selection and navigation are complete.
   */
  async selectRootDirectory(): Promise<void> {
    const response = await this.electronService.openDirectory();
    this.logger.debug(response);
    if (response.length > 0) {
      localStorage.setItem(APP_CONSTANTS.WORKING_DIR, response[0]);
      const currentConfig =
        (await this.electronService.getStoreValue('APP_CONFIG')) || {};
      const updatedConfig = { ...currentConfig, directoryPath: response[0] };
      await this.electronService.setStoreValue('APP_CONFIG', updatedConfig);

      this.logger.debug('===>', this.router.url);
      if (this.router.url === '/apps') {
        await this.electronService.reloadApp();
      } else {
        await this.router.navigate(['/apps']);
      }
    }
  }

  openSelectRootDirectoryModal() {
    const modalRef = this.dialog.open(SelectRootDirectoryComponent, {
      disableClose: true,
    });

    modalRef.afterClosed().subscribe((res) => {
      if (res === true) {
        this.selectRootDirectory().then();
      }
    });
  }

  openSettingsModal() {
    this.dialog.open(SettingsComponent, {
      disableClose: true,
    });
  }
}
