import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { LLMConfigModel } from "../../model/interfaces/ILLMConfig";
import { SetLLMConfig, FetchDefaultLLMConfig, VerifyLLMConfig, SyncLLMConfig } from './llm-config.actions';
import { tap, catchError, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { of, timer } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { AvailableProviders, ProviderModelMap } from '../../constants/llm.models.constants';
import { ElectronService } from '../../services/electron/electron.service';
import { DEFAULT_TOAST_DURATION } from 'src/app/constants/toast.constant';

export interface LLMConfigStateModel extends LLMConfigModel {
  isDefault: boolean;
}

@State<LLMConfigStateModel>({
  name: 'LLMConfig',
  defaults: {
    provider: '',
    config: {
      apiKey: '',
      endpoint: '',
      deploymentId: '',
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
      region: '',
      crossRegion: false,
      model: '',
      baseUrl: '',
      maxRetries: 3
    },
    isDefault: true
  }
})
@Injectable()
export class LLMConfigState {
  private lastVerificationTime: number = 0;
  private readonly DEBOUNCE_TIME = 5000; // 5 seconds

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
      tap((defaultConfig: LLMConfigModel) => {
        if (!defaultConfig.provider) {
          // Set default values if not provided
          const defaultProvider = AvailableProviders[0].key;
          defaultConfig = {
            provider: defaultProvider,
            config: {
              ...defaultConfig.config,
              model: ProviderModelMap[defaultProvider][0]
            }
          };
        }
        setState({ ...defaultConfig, isDefault: true });
        dispatch(new SyncLLMConfig());
      }),
      catchError((error) => {
        console.error('Error fetching default LLM config:', error);
        this.toasterService.showError('Failed to fetch default LLM configuration.');
        return of({ provider: '', config: {} });
      }),
      finalize(() => {
        this.loadingService.setLoading(false);
      })
    );
  }

  @Action(VerifyLLMConfig)
  verifyLLMConfig({ getState, dispatch }: StateContext<LLMConfigStateModel>) {
    const currentTime = Date.now();
    if (currentTime - this.lastVerificationTime < this.DEBOUNCE_TIME) {
      return of(null); // Skip if called within debounce time
    }
    this.lastVerificationTime = currentTime;

    const state = getState();
    this.loadingService.setLoading(true);

    return timer(0).pipe( // Use timer to ensure we're not blocking the main thread
      tap(async () => {
        try {
          const response = await this.electronService.verifyLLMConfig(state.provider, state.config);
          const providerDisplayName = AvailableProviders.find(p => p.key === state.provider)?.displayName || state.provider;

          if (response.status === 'failed') {
            // Get default config and reset
            const defaultConfig = await this.electronService.getStoreValue('defaultLLMConfig');
            if (defaultConfig) {
              const defaultProviderDisplayName = AvailableProviders.find(p => p.key === defaultConfig.provider)?.displayName || defaultConfig.provider;
              this.toasterService.showInfo(
                `LLM configuration error. Resetting to default LLM configuration - ${defaultProviderDisplayName}: ${defaultConfig.config.model || defaultConfig.config.deploymentId}`, 
                DEFAULT_TOAST_DURATION
              );
              dispatch(new FetchDefaultLLMConfig());
            } else {
              throw new Error('No default configuration available');
            }
          }

          // Always sync the config after verification, regardless of success or failure
          dispatch(new SyncLLMConfig());
        } catch (error) {
          console.error('Error verifying LLM config:', error);
          this.toasterService.showError(
            'Failed to verify provider and model configuration', 
            DEFAULT_TOAST_DURATION
          );
          dispatch(new FetchDefaultLLMConfig());
        } finally {
          this.loadingService.setLoading(false);
        }
      })
    );
  }
}
