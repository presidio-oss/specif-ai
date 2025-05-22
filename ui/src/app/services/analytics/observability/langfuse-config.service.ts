import { Injectable } from '@angular/core';
import { ElectronService } from '../../../electron-bridge/electron.service';

export interface VerifyLangfuseConfigResponse {
  status: 'success' | 'failed';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class LangfuseConfigService {
  constructor(private electronService: ElectronService) {}

  verifyConfig(config: any): Promise<VerifyLangfuseConfigResponse> {
    return this.electronService.verifyLangfuseConfig(config);
  }
}
