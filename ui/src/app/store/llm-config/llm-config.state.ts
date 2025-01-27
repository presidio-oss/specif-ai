import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { LLMConfigModel } from "../../model/interfaces/ILLMConfig";
import { SetLLMConfig, FetchDefaultLLMConfig, VerifyLLMConfig } from './llm-config.actions';
import { tap, catchError, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { ToasterService } from '../../services/toaster/toaster.service';

export interface LLMConfigStateModel extends LLMConfigModel {
  isDefault: boolean;
}

@State<LLMConfigStateModel>({
  name: 'LLMConfig',
  defaults: {
    apiKey: '',
    model: '',
    provider: '',
    apiUrl: '',
    isDefault: true
  }
})
@Injectable()
export class LLMConfigState {
  constructor(
    private http: HttpClient,
    private loadingService: LoadingService,
    private toastService: ToasterService
  ) {}

  @Selector()
  static getConfig(state: LLMConfigStateModel) {
    return state;
  }

  @Action(SetLLMConfig)
  setLLMConfig({ setState }: StateContext<LLMConfigStateModel>, { payload }: SetLLMConfig) {
    setState({ ...payload, isDefault: false });
  }

  @Action(FetchDefaultLLMConfig)
  fetchDefaultLLMConfig({ setState }: StateContext<LLMConfigStateModel>) {
    this.loadingService.setLoading(true);
    return this.http.get<LLMConfigModel>('llm-config/defaults').pipe(
      tap((defaultConfig) => {
        setState({ ...defaultConfig, isDefault: true });
      }),
      catchError((error) => {
        console.error('Error fetching default LLM config:', error);
        this.toastService.showError('Failed to fetch default LLM configuration.');
        return of({ provider: '', model: '' });
      }),
      finalize(() => {
        this.loadingService.setLoading(false);
      })
    );
  }

  @Action(VerifyLLMConfig)
  verifyLLMConfig({ getState, dispatch }: StateContext<LLMConfigStateModel>) {
    const state = getState();
    this.loadingService.setLoading(true);
    return this.http.post('model/config-verification', {
      provider: state.provider,
      model: state.model
    }).pipe(
      tap((response: any) => {
        if (response.status === 'failed') {
          this.toastService.showError('Current provider configuration verification failed. Setting to default provider configuration');
          dispatch(new FetchDefaultLLMConfig());
        } else {
          this.toastService.showSuccess('Provider configuration verified and saved successfully');
        }
      }),
      catchError((error) => {
        console.error('Error verifying LLM config:', error);
        this.toastService.showError('Failed to verify provider and model configuration');
        dispatch(new FetchDefaultLLMConfig());
        return of(null);
      }),
      finalize(() => {
        this.loadingService.setLoading(false);
      })
    );
  }
}
