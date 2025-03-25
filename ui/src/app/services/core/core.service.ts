import { Injectable } from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';

interface AppConfig {
  key: string;
  host: string;
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
