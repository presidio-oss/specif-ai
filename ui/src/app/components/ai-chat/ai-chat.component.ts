import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  ChatWithAIPayload,
  suggestionPayload,
} from '../../model/interfaces/chat.interface';
import { ChatService } from '../../services/chat/chat.service';
import { UtilityService } from '../../services/utility.service';
import { TOOLTIP_CONTENT, APP_MESSAGES, CHAT_TYPES, REQUIREMENT_TYPE } from '../../constants/app.constants';
import { Store } from '@ngxs/store';
import { Observable, Subscription } from 'rxjs';
import { ChatSettings } from 'src/app/model/interfaces/ChatSettings';
import { ChatSettingsState } from 'src/app/store/chat-settings/chat-settings.state';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroDocumentPlus,
  heroCheck,
  heroPaperClip,
  heroInformationCircle,
  heroXMark,
  heroDocumentText,
  heroHandThumbUp,
  heroHandThumbDown,
  heroWrench
} from '@ng-icons/heroicons/outline';
import { heroHandThumbDownSolid, heroHandThumbUpSolid, heroSparklesSolid } from '@ng-icons/heroicons/solid'
import { environment } from '../../../environments/environment';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { ProjectsState } from 'src/app/store/projects/projects.state';
import { ToggleComponent } from '../toggle/toggle.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { ERROR_MESSAGES } from '../../constants/app.constants';
import { ElectronService } from '../../electron-bridge/electron.service';
import { AnalyticsEvents, AnalyticsEventSource, AnalyticsEventStatus } from 'src/app/services/analytics/events/analytics.events';
import { AnalyticsTracker } from 'src/app/services/analytics/analytics.interface';
import { analyticsEnabledSubject } from 'src/app/services/analytics/utils/analytics.utils';
import { v4 as uuid4 } from 'uuid';
import { RichTextEditorComponent } from "../core/rich-text-editor/rich-text-editor.component";
import { CustomAccordionComponent } from "../custom-accordion/custom-accordion.component";
import { JsonPipe } from "@angular/common";
import { ThreeBounceLoaderComponent } from "../three-bounce-loader/three-bounce-loader.component";

@Component({
  selector: 'app-chat',
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    FormsModule,
    NgIconComponent,
    ToggleComponent,
    MatTooltipModule,
    NgClass,
    CustomAccordionComponent,
    RichTextEditorComponent,
    JsonPipe,
    ThreeBounceLoaderComponent
],
  providers: [
    provideIcons({
      heroDocumentPlus,
      heroCheck,
      heroPaperClip,
      heroInformationCircle,
      heroXMark,
      heroSparklesSolid,
      heroHandThumbUp,
      heroHandThumbDown,
      heroDocumentText,
      heroHandThumbUpSolid,
      heroHandThumbDownSolid,
      heroWrench
    })
  ]
})
export class AiChatComponent implements OnInit {
  isFeedbackModalOpen: boolean = false;
  feedbackType: 'like' | 'dislike' | null = null;
  feedbackText: string = '';
  protected readonly APP_MESSAGES = APP_MESSAGES;
  protected readonly TOOLTIP_CONTENT = TOOLTIP_CONTENT;
  protected readonly themeConfiguration = environment.ThemeConfiguration;
  @Input() chatType: string = 'requirement';
  @Input() fileName: string = '';
  @Input() name: string = '';
  @Input() description: string = '';
  @Input() baseContent: string = '';
  @Input() chatHistory: any = [];
  @Input() supportsAddFromCode: boolean = true;
  @Input() prd: string | undefined;
  @Input() userStory: string | undefined;
  @Input() containerClass: string = '';
  @Input() brds: Array<{
    id: string;
    title: string;
    requirement: string;
  }> | undefined;

  metadata: any = {};
  isKbAvailable: boolean = false;
  showFeedbackBadge = false;
  private subscription: Subscription = new Subscription();


  chatSettings$: Observable<ChatSettings> = this.store.select(
    ChatSettingsState.getConfig,
  );

  @Output() getContent: EventEmitter<any> = new EventEmitter<any>();
  @Output() updateChatHistory: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('scrollToBottom') scrollToBottom: any;

  basePayload: suggestionPayload = {
    name: '',
    type: '',
    description: '',
    requirement: '',
    requirementAbbr: '',
    appId: ''
  };
  type: string = '';
  requirementAbbrivation: string = '';
  projectId: string = '';
  message: string = '';
  chatSuggestions: Array<string> = [];
  localSuggestions: Array<string> = [];
  selectedSuggestion: string = '';
  generateLoader: boolean = false;
  loadingChat: boolean = false;
  responseStatus: boolean = false;
  kb: string = '';
  accessKey: string = '';
  secretKey: string = '';
  sessionKey: string = '';
  region: string = ''
  isKbActive: boolean = false;

  selectedFiles: File[] = [];
  selectedFilesContent: string = '';
  feedbackMessage: any = {};
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  constructor(
    private chatService: ChatService,
    private electronService: ElectronService,
    private utilityService: UtilityService,
    private store: Store,
    private toastService: ToasterService,
    private analyticsTracker: AnalyticsTracker
  ) {}

  smoothScroll() {
    setTimeout(() => {
      this.scrollToBottom.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }, 500);
  }

  ngOnInit() {
    this.store.select(ProjectsState.getMetadata).subscribe((res) => {
      this.metadata = res;
    });

    this.subscription.add(
      analyticsEnabledSubject.subscribe(enabled => {
        this.showFeedbackBadge = enabled;
      })
    );

    this.isKbAvailable = !!this.metadata.integration?.bedrock?.kbId;

    if (this.isKbAvailable) {
      this.chatSettings$.subscribe((settings) => {
        this.kb = settings?.kb;
        this.accessKey = settings?.accessKey;
        this.secretKey = settings?.secretKey;
        this.sessionKey = settings?.sessionKey;
        this.region = settings?.region;

        this.isKbActive = settings?.kb !== '';
      });
    }

    if (this.chatType == CHAT_TYPES.REQUIREMENT) {
      this.requirementAbbrivation = this.utilityService.getRequirementType(
        this.fileName,
      );
      this.type = this.utilityService
        .expandRequirementName(this.fileName)
        .slice(0, -2);
    } else if (this.chatType == CHAT_TYPES.USERSTORY) {
      this.type = 'User Story';
      this.requirementAbbrivation = REQUIREMENT_TYPE.US;
    } else if (this.chatType == CHAT_TYPES.TASK) {
      this.type = 'Task for User Story';
      this.requirementAbbrivation = REQUIREMENT_TYPE.TASK;
    }
    this.smoothScroll();
    setTimeout(() => {
      this.generateLoader = false;
      this.basePayload = {
        name: this.name,
        description: this.description,
        type: this.type,
        requirement: this.baseContent,
        knowledgeBase: this.kb,
        requirementAbbr: this.requirementAbbrivation,
        appId: this.metadata.id
      };
      this.getSuggestion();
    }, 1000);
  }

  getSuggestion() {
    this.loadingChat = true;
    const additionalPRDContext =
      this.requirementAbbrivation === REQUIREMENT_TYPE.PRD
        ? {
            brds: this.brds,
          }
        : {};

    const suggestionPayload: suggestionPayload = {
      ...this.basePayload,
      requirement: this.baseContent,
      suggestions: this.localSuggestions,
      selectedSuggestion: this.selectedSuggestion,
      appId: this.metadata.id,
      ...additionalPRDContext
    };

    if (this.isKbActive && this.kb) {
      suggestionPayload.bedrockConfig = {
        region: this.region,
        accessKey: this.accessKey,
        secretKey: this.secretKey,
        sessionKey: this.sessionKey
      };
    }
    this.chatService
      .generateSuggestions(suggestionPayload)
      .then((response: Array<''>) => {
        this.chatSuggestions = response;
        this.localSuggestions.push(...response);
        this.analyticsTracker.trackResponseTime(AnalyticsEventSource.GENERATE_SUGGESTIONS)
        this.loadingChat = false;
        this.responseStatus = false;
        this.smoothScroll();
      })
      .catch((err) => {
        this.toastService.showError(ERROR_MESSAGES.GENERATE_SUGGESTIONS_FAILED);
        this.loadingChat = false;
        this.responseStatus = false;
        this.smoothScroll();
      });
  }

  getSlicedChatHistory() {
    // this method will get the last 15 messages from the chat history
    // if the message at the starting index is not a human message
    // we will move to the next index and continue until we find a user message
    // this is a temporary fix to limit the chat history to the last 20 messages so we won't exceed the context limit (for summarization)
    // In the future, we may need to implement a more sophisticated approach

    const slicedChatHistory = this.chatHistory
      .slice(-15);

    let startIndex = Math.max(0, slicedChatHistory.length - 15);
    let endIndex = slicedChatHistory.length;

    while (startIndex < endIndex) {
      const item = slicedChatHistory[startIndex];
      if (!item.user) {
        startIndex++;
      } else {
        break;
      }
    }

    return slicedChatHistory.slice(startIndex, endIndex);
  }

  finalCall() {
    // Format chat history according to the schema
    const formattedChatHistory = this.getSlicedChatHistory()
      .map((item: any) => {
        if (item.user) {
          return {
            id: item.id,
            type: 'user',
            content: [
              ...(item.user ? [{ type: 'text', text: item.user }] : []),
            ],
          };
        } else if (item.assistant || item.toolCalls) {
          return {
            id: item.id,
            type: 'assistant',
            content: [
              ...(item.assistant
                ? [
                    {
                      type: 'text',
                      text: item.assistant,
                    },
                  ]
                : []),
            ],
            toolCalls: (item.toolCalls || []).map((call: any) => ({
              id: call.id,
              name: call.name,
              args: call.args || {},
            })),
          };
        } else if (item.tool) {
          return {
            id: item.id,
            type: 'tool',
            name: item.name,
            content: item.tool,
            tool_call_id: item.tool_call_id,
          };
        }
        return null;
      })
      .filter((item:any) => item !== null);

    const requestId = uuid4();

    // Prepare payload according to ChatWithAIPayload interface
    const payload: ChatWithAIPayload = {
      requestId: requestId,
      project: {
        name: this.name,
        description: this.description
      },
      chatHistory: formattedChatHistory,
      requirementAbbr: this.requirementAbbrivation,
      requirement: {
        description: this.baseContent
      }
    };

    // Add requirement-specific context
    switch (this.requirementAbbrivation) {
      case REQUIREMENT_TYPE.PRD:
        payload.brds = this.brds;
        break;
      case REQUIREMENT_TYPE.US:
        payload.prd = this.prd;
        break;
      case REQUIREMENT_TYPE.TASK:
        payload.prd = this.prd;
        payload.userStory = this.userStory;
        break;
    }

    // Set up streaming response handler
    const streamHandler = (_: any, event: any) => {
      switch(event.event){
        // when the chat model in llm node starts create a new message
        case "on_chat_model_start":{
          if(event["metadata"]["langgraph_node"] === "llm"){
            this.generateLoader = true;
            this.chatHistory.push({ assistant: '' });
          }
          break;
        }
        // when the chat model in llm node streams a chunk of data
        // update the last message with the chunk
        case 'on_chat_model_stream': {
          if(event["metadata"]["langgraph_node"] === "llm"){
            const chunk = event.data.chunk;

            if(chunk.content){
              this.generateLoader = false;
            }

            this.updateLastAIMessage(chunk.content, []);
          }
          break;
        }
        // when the chat model in llm node ends
        // update the last message with the tool calls
        case 'on_chat_model_end': {
          if(event.metadata.langgraph_node === "llm"){
            // this.generateLoader = false;
            const toolCalls = event.data.output.tool_calls;
            this.updateLastAIMessage('', toolCalls);
          }
          break;
        }
        // when the chain ends
        // handle completion, remove listener after completion
        case 'on_chain_end': {
          // workflow end event
          if (event.name === 'LangGraph') {
            // Handle completion
            this.generateLoader = false;
            this.returnChatHistory();
          }

          // tool node end event
          if((event.name as string).toLocaleLowerCase() === "tools"){
            const toolMessages = event.data.output.messages;
            this.chatHistory.push(...toolMessages.map((tm: any)=>{
              const aiMessageWithToolCall = this.chatHistory.find((item: any) => {
                if (item.toolCalls && item.toolCalls.length > 0) {
                  return item.toolCalls.some((call: any) => call.id === tm.tool_call_id);
                }

                return false;
              });

              const toolCall = aiMessageWithToolCall.toolCalls.find((call: any)=>(call.id === tm.tool_call_id));

              return {
                tool: tm.content,
                name: tm.name,
                tool_call_id: tm.tool_call_id,
                args: toolCall.args,
              }
            }))
            this.returnChatHistory();
          }
          break;
        }
      }
    };

    // Register stream handler
    this.electronService.listenChatEvents(requestId, streamHandler);

    // Initiate chat
    this.electronService.chatWithAI(payload)
      .catch((error) => {
        console.error('Chat error:', error);
        this.toastService.showError('Chat failed. Please try again.');
      })
      .finally(()=>{
        this.generateLoader = false;
        this.electronService.removeChatListener(requestId, streamHandler);
      });
  }

  update(chat: any) {
    let data = {
      chat,
      chatHistory: this.chatHistory,
    };
    this.getContent.emit(data);
    this.getSuggestion();
  }

  updateLastAIMessage(content?: string, toolCalls?: any[]) {
    const lastMessage = this.chatHistory[this.chatHistory.length - 1];

    if (lastMessage?.assistant !== undefined) {
      // Update existing assistant message
      if (content) {
        lastMessage.assistant += content;
      }

      if (toolCalls && toolCalls.length > 0) {
        // Initialize toolCalls array if it doesn't exist
        if (!lastMessage.toolCalls) {
          lastMessage.toolCalls = [];
        }

        // Add new tool calls, avoiding duplicates
        toolCalls.forEach((call) => {
          const existingCall = lastMessage.toolCalls.find(
            (tc: any) => tc.id === call.id,
          );

          if (!existingCall) {
            lastMessage.toolCalls.push({
              id: call.id,
              name: call.name,
              args: call.args || {},
            });
          }
        });
      }

      this.chatHistory[this.chatHistory.length - 1] = { ...lastMessage };
    } else if (content || (toolCalls && toolCalls.length > 0)) {
      // Create new assistant message
      this.chatHistory.push({
        assistant: content || '',
        toolCalls: toolCalls
          ? toolCalls.map((call) => ({
              id: call.id,
              name: call.name,
              args: call.args || {},
            }))
          : [],
      });
    }

    this.returnChatHistory();
  }

  returnChatHistory() {
    console.log('Chat history updated:', this.chatHistory);
    this.updateChatHistory.emit(this.chatHistory);
  }

  onFileSelected(event: any): void {
    const newFiles: File[] = event.target.files;
    if (newFiles.length > 0) {
      const errorFiles: string[] = [];
      const duplicateFiles: string[] = [];
      const validFiles: File[] = [];

      // Check each new file

      for (const file of Array.from(newFiles)) {
        if (file.size === 0) {
          errorFiles.push(file.name);
          continue;
        }

        // Check if file already exists in selectedFiles
        const isDuplicate = this.selectedFiles.some(
          existingFile => existingFile.name === file.name
        );

        if (isDuplicate) {
          duplicateFiles.push(file.name);
        } else {
          validFiles.push(file);
        }
      }

      // Add new valid files to existing ones
      validFiles.forEach(file => {
        this.selectedFiles.push(file);
        this.readFileContent(file);
      });

      // Show appropriate error messages
      if (errorFiles.length > 0) {
        this.toastService.showError(`Empty file(s): ${errorFiles.join(', ')}`);
      }
      if (duplicateFiles.length > 0) {
        this.toastService.showError(`Duplicate file(s): ${duplicateFiles.join(', ')}`);
      }
    }

  }
  readFileContent(file: File): void {    const reader = new FileReader();
    reader.onload = (event: any) => {
      // Append new content without clearing existing content
      this.selectedFilesContent += file.name + '\n\n' + event.target.result + '\n\n';
    };
    reader.readAsText(file);
  }

  removeFile(index: number) {
    // Remove the file from selectedFiles array
    this.selectedFiles.splice(index, 1);

    // Reset and rebuild selectedFilesContent from remaining files
    this.selectedFilesContent = '';
    this.selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        this.selectedFilesContent += file.name + '\n\n' + event.target.result + '\n\n';
      };
      reader.readAsText(file);
    });
  }

  openFeedbackModal(chat: any, type: 'like' | 'dislike') {
    this.isFeedbackModalOpen = true;
    this.feedbackMessage = chat;
    this.feedbackType = type;
    this.feedbackText = '';
  }

  closeFeedbackModal() {
    this.isFeedbackModalOpen = false;
    this.feedbackType = null;
    this.feedbackMessage = null;
    this.feedbackText = '';
  }

  submitFeedback() {
    if (this.feedbackMessage.assistant) {
      this.feedbackMessage.isLiked = this.feedbackType === 'like';
      this.feedbackType === 'like' ? '1' : '0'
    }
    if (this.feedbackType) {
      this.analyticsTracker.trackEvent(AnalyticsEvents.FEEDBACK_SUBMITTED, {
        isLiked: this.feedbackType === 'like' ? '1' : '0',
        text: this.feedbackText,
        message: this.feedbackMessage.assistant,
        source: `${AnalyticsEventSource.AI_CHAT} for ${this.chatType}`,
        status: AnalyticsEventStatus.SUCCESS
      });
    }
    this.returnChatHistory();
    this.closeFeedbackModal();
  }

  converse(message: string) {
    this.responseStatus = true;
    this.selectedSuggestion = message;
    this.chatSuggestions = [];

    if (message || this.selectedFiles.length > 0) {
      this.generateLoader = true;

      // Add user message and files to chat history
      if (message && this.selectedFiles.length > 0) {
        // Both message and files
        this.chatHistory = [...this.chatHistory, {
          user: message,
          files: this.selectedFiles.map(f => ({
            name: f.name,
            size: this.formatFileSize(f.size),
          })),
          selectedFilesContent: this.selectedFilesContent
        }];
      } else if (this.selectedFiles.length > 0) {
        // Only files
        this.chatHistory = [...this.chatHistory, {
          files: this.selectedFiles.map(f => ({
            name: f.name,
            size: this.formatFileSize(f.size)
          })),
          selectedFilesContent: this.selectedFilesContent
        }];
      } else {
        // Only message
        this.chatHistory = [...this.chatHistory, { user: message }];
      }

      this.finalCall();

      // Clear message and files after sending
      this.message = '';
      this.selectedFiles = [];
      this.selectedFilesContent = '';
      this.responseStatus = false;
    }
  }

  get isSendDisabled(): boolean {
    return this.generateLoader || (!this.message?.trim() && this.selectedFiles.length === 0);
  }

  onKbToggle(isActive: boolean) {
    this.isKbActive = isActive;
    this.kb = isActive ? this.metadata.integration?.bedrock?.kbId : '';

    // Update base payload with new KB setting
    this.basePayload = {
      ...this.basePayload,
      knowledgeBase: this.kb
    };

    this.getSuggestion();
  }

  onChatInputKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !this.isSendDisabled) {
      event.preventDefault(); // Prevent new line
      this.converse(this.message);
    }
  }
}
