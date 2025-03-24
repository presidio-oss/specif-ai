import { State, Action, StateContext, Selector } from '@ngxs/store';
import { ChatSettings } from 'src/app/model/interfaces/ChatSettings';
import { SetChatSettings } from './chat-settings.action';

@State<ChatSettings>({
  name: 'ChatSettings',
  defaults: {
    kb: '',
    accessKey: '',
    secretKey: '',
    sessionKey: '',
    region: ''
  },
})
export class ChatSettingsState {
  @Selector()
  static getConfig(state: ChatSettings) {
    return state;
  }

  @Action(SetChatSettings)
  setChatSettings(
    { setState }: StateContext<ChatSettings>,
    { payload }: SetChatSettings,
  ) {
    setState({ ...payload });
  }
}
