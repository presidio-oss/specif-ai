import { Injectable } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { IpcRequest } from '../interfaces/ipc.interface';
import { Store } from '@ngxs/store';
import { LLMConfigState } from '../store/llm-config/llm-config.state';
import { ToasterService } from '../services/toaster/toaster.service';

const exemptedChannels = ['core:getAppConfig', 'core:verifyLLMConfig'];

@Injectable({
  providedIn: 'root',
})
export class IpcInterceptor {
  constructor(
    private loadingService: LoadingService,
    private store: Store,
    private toasterService: ToasterService,
  ) {}

  request(request: IpcRequest): Promise<any> {
    const config = this.store.selectSnapshot(LLMConfigState.getConfig);

    if (
      request.skipWarning !== true &&
      (!config.activeProvider ||
        Object.keys(config.providerConfigs).length === 0)
        && !exemptedChannels.includes(request.channel)
    ) {
      this.toasterService.showError(
        'Please configure LLM details to continue',
        undefined,
        true,
      );
      return Promise.reject(new Error('LLM configuration required'));
    }

    if (!request.skipLoading) {
      this.loadingService.setLoading(true);
    }

    return window.electronAPI
      .invoke(request.channel, ...(request.args || []))
      .finally(() => {
        if (!request.skipLoading) {
          this.loadingService.setLoading(false);
        }
      });
  }
}
