import { Injectable } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { IpcRequest } from '../interfaces/ipc.interface';

@Injectable({
  providedIn: 'root'
})
export class IpcInterceptor {
  constructor(private loadingService: LoadingService) {}

  request(request: IpcRequest): Promise<any> {
    if (!request.skipLoading) {
      this.loadingService.setLoading(true);
    }

    return window.electronAPI.invoke(request.channel, ...(request.args || []))
      .finally(() => {
        if (!request.skipLoading) {
          this.loadingService.setLoading(false);
        }
      });
  }
}
