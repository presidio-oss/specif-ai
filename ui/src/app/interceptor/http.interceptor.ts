import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { finalize, retry } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { LoadingService } from '../services/loading.service';
import { LLMConfigState } from '../store/llm-config/llm-config.state';
import { ToasterService } from '../services/toaster/toaster.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(
    private loadingService: LoadingService,
    private store: Store,
    private toasterService: ToasterService,
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const skipLoader = request.headers.has('skipLoader');

    const config = this.store.selectSnapshot(LLMConfigState.getConfig);
    const model = config.config?.model || config.config?.deploymentId || '';
    const provider = config.provider || '';

    const modifiedRequest = request.clone({
      setHeaders: {
        'X-Provider': provider,
        'X-Model': model,
      },
    });

    if (!skipLoader) {
      this.loadingService.setLoading(true);
    }

    return next.handle(modifiedRequest).pipe(
      retry({
        count: 3,
        delay: (error: HttpErrorResponse) => {
          if (error.status >= 500) {
            return timer(1);
          }
          if (!(request.url.includes('auth/verify_access_token') && (error.status === 401 || error.status === 403))) {
            this.toasterService.showError(error?.message);
          }
          throw error;
        },
      }),
      finalize(() => {
        if (!skipLoader) {
          this.loadingService.setLoading(false);
        }
      }),
    );
  }
}
