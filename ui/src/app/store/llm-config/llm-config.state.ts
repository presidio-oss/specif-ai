import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { LLMConfigModel } from "../../model/interfaces/ILLMConfig";
import { SetLLMConfig, FetchDefaultLLMConfig, VerifyLLMConfig, SyncLLMConfig } from './llm-config.actions';
import { tap, catchError, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { AvailableProviders } from '../../constants/llm.models.constants';
import { ElectronService } from '../../services/electron/electron.service';

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
    private toasterService: ToasterService,
    private electronService: ElectronService
  ) {}

  @Selector()
  static getConfig(state: LLMConfigStateModel) {
    return state;
  }

  @Action(SetLLMConfig)
  setLLMConfig({ setState, dispatch }: StateContext<LLMConfigStateModel>, { payload }: SetLLMConfig) {
    setState({ ...payload, isDefault: false });
    dispatch(new SyncLLMConfig());
  }

  @Action(SyncLLMConfig)
  syncLLMConfig({ getState }: StateContext<LLMConfigStateModel>) {
    const state = getState();
    localStorage.setItem('llmConfig', JSON.stringify(state));
    this.electronService.setStoreValue('llmConfig', state);
  }

  @Action(FetchDefaultLLMConfig)
  fetchDefaultLLMConfig({ setState, dispatch }: StateContext<LLMConfigStateModel>) {
    this.loadingService.setLoading(true);
    return this.http.get<LLMConfigModel>('llm-config/defaults').pipe(
      tap((defaultConfig) => {
        setState({ ...defaultConfig, isDefault: true });
        dispatch(new SyncLLMConfig());
      }),
      catchError((error) => {
        console.error('Error fetching default LLM config:', error);
        this.toasterService.showError('Failed to fetch default LLM configuration.');
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
        const providerDisplayName = AvailableProviders.find(p => p.key === state.provider)?.displayName || state.provider;
        if (response.status === 'failed') {
          this.http.get<LLMConfigModel>('llm-config/defaults').pipe(
            tap((defaultConfig) => {
              const defaultProviderDisplayName = AvailableProviders.find(p => p.key === defaultConfig.provider)?.displayName || defaultConfig.provider;
              this.toasterService.showError(`Something went wrong. Reset to default LLM configuration - ${defaultProviderDisplayName} : ${defaultConfig.model}`, 5000);
              dispatch(new FetchDefaultLLMConfig());
            }),
            catchError((error) => {
              console.error('Error fetching default LLM config:', error);
              this.toasterService.showError('Failed to fetch default LLM configuration.', 5000);
              return of(null);
            })
          ).subscribe();
        } else {
          this.toasterService.showSuccess(`${providerDisplayName} : ${state.model} is configured successfully.`, 5000);
          dispatch(new SyncLLMConfig());
        }
      }),
      catchError((error) => {
        console.error('Error verifying LLM config:', error);
        this.toasterService.showError('Failed to verify provider and model configuration', 5000);
        dispatch(new FetchDefaultLLMConfig());
        return of(null);
      }),
      finalize(() => {
        this.loadingService.setLoading(false);
      })
    );
  }
}
