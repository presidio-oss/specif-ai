import { Injectable } from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';

export interface AppConfig {
  posthogKey: string;
  posthogHost: string;
  posthogEnabled: boolean;
  langfuseEnabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  constructor(private electronService: ElectronService) {}

  async getAppConfig(): Promise<AppConfig> {
    return this.electronService.getAppConfig();
  }
}
