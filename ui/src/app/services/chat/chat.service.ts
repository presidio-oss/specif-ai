import { Injectable } from '@angular/core';
import {
  suggestionPayload,
  conversePayload,
  ChatUpdateRequirementResponse,
} from '../../model/interfaces/chat.interface';
import { CHAT_TYPES } from '../../constants/app.constants';
import { ElectronService } from '../../electron-bridge/electron.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor(private electronService: ElectronService) {}

  generateSuggestions(request: suggestionPayload): Promise<Array<''>> {
    return this.electronService.getSuggestions(request);
  }

  chatWithLLM(type: string, request: conversePayload): Promise<ChatUpdateRequirementResponse> {
    if (type === CHAT_TYPES.REQUIREMENT) {
      return this.electronService.chatUpdateRequirement(request);
    } else {
      return this.electronService.chatUserStoryTask(request)
    }
  }
}
