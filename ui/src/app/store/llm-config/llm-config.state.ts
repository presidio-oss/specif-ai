import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { LLMConfigModel } from "../../model/interfaces/ILLMConfig";
import { SetLLMConfig, VerifyLLMConfig, SyncLLMConfig, SwitchProvider } from './llm-config.actions';
import { tap, catchError, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { of, timer } from 'rxjs';
import { LoadingService } from '../../services/loading.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { AvailableProviders, ProviderModelMap } from '../../constants/llm.models.constants';
import { ElectronService } from '../../electron-bridge/electron.service';
import { DEFAULT_TOAST_DURATION } from 'src/app/constants/toast.constant';

@State<LLMConfigModel>({
  name: 'LLMConfig',
  defaults: {
    activeProvider: '',
    providerConfigs: {},
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
  static getConfig(state: LLMConfigModel) {
    return state;
  }

  @Selector()
  static getAllProviderConfigs(state: LLMConfigModel) {
    return state.providerConfigs;
  }

  @Selector()
  static getActiveProvider(state: LLMConfigModel) {
    return state.activeProvider;
  }

  @Action(SetLLMConfig)
  setLLMConfig({ setState, getState, dispatch }: StateContext<LLMConfigModel>, { payload }: SetLLMConfig) {
    setState(payload);
    dispatch(new SyncLLMConfig());
  }

  @Action(SyncLLMConfig)
  syncLLMConfig({ getState }: StateContext<LLMConfigModel>) {
    const state = getState();
    localStorage.setItem('llmConfig', JSON.stringify(state));
    this.electronService.setStoreValue('llmConfig', state);
  }

  @Action(SwitchProvider)
  switchProvider({ getState, setState }: StateContext<LLMConfigModel>, { provider }: SwitchProvider) {
    const state = getState();
    
    // Only switch if we have a configuration for this provider
    if (!state.providerConfigs[provider]) {
      this.toasterService.showError(`No configuration found for provider: ${provider}`);
      return;
    }

    setState({
      ...state,
      activeProvider: provider
    });
  }

  @Action(VerifyLLMConfig)
  verifyLLMConfig({ getState, setState, dispatch }: StateContext<LLMConfigModel>) {
    const currentTime = Date.now();
    if (currentTime - this.lastVerificationTime < this.DEBOUNCE_TIME) {
      return of(null); // Skip if called within debounce time
    }
    this.lastVerificationTime = currentTime;

    const state = getState();
    if (!state.activeProvider) {
      return of(null);
    }
    this.loadingService.setLoading(true);

    return timer(0).pipe( // Use timer to ensure we're not blocking the main thread
      tap(async () => {
        try {
          const response = await this.electronService.verifyLLMConfig(
            state.activeProvider,
            state.providerConfigs[state.activeProvider].config
          );

          if (response.status === 'failed') {
            const providerDisplayName = AvailableProviders.find(p => p.key === state.activeProvider)?.displayName || state.activeProvider;
            this.toasterService.showError(
              `Failed to verify ${providerDisplayName} configuration. Please check your credentials and try again.`,
              DEFAULT_TOAST_DURATION
            );
          }

          // Always sync the config after verification, regardless of success or failure
          dispatch(new SyncLLMConfig());
        } catch (error) {
          console.error('Error verifying LLM config:', error);
          const providerDisplayName = AvailableProviders.find(p => p.key === state.activeProvider)?.displayName || state.activeProvider;
          this.toasterService.showError(
            `Failed to verify ${providerDisplayName} configuration. Please check your credentials and try again.`, 
            DEFAULT_TOAST_DURATION
          );
          // Keep existing config, just sync it
          dispatch(new SyncLLMConfig());
        } finally {
          this.loadingService.setLoading(false);
        }
      })
    );
  }
}
