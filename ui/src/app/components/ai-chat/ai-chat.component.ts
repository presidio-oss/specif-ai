import {
  assertInInjectionContext,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  ChatUpdateRequirementResponse,
  conversePayload,
  suggestionPayload,
} from '../../model/interfaces/chat.interface';
import { ChatService } from '../../services/chat/chat.service';
import { UtilityService } from '../../services/utility.service';
import { TOOLTIP_CONTENT, APP_MESSAGES, CHAT_TYPES, TOASTER_MESSAGES } from '../../constants/app.constants';
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
  heroHandThumbDown
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
      heroHandThumbDownSolid
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
    } else if (this.chatType == CHAT_TYPES.TASK) {
      this.type = 'Task for User Story';
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
      };
      this.getSuggestion();
    }, 1000);
  }

  getSuggestion() {
    this.loadingChat = true;
    const suggestionPayload: suggestionPayload = {
      ...this.basePayload,
      requirement: this.baseContent,
      suggestions: this.localSuggestions,
      selectedSuggestion: this.selectedSuggestion,
    };
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

  finalCall(message: string) {
    let payload: conversePayload = {
      ...this.basePayload,
      chatHistory: this.chatHistory
        .map((item: any) => {
          if (item.user) return { user: item.user };
          else return { assistant: item.assistant };
        })
        .slice(0, -1),
      userMessage: message,
      knowledgeBase: this.kb,
    };
    if (this.chatType === CHAT_TYPES.REQUIREMENT)
      payload = { ...payload, requirementAbbr: this.requirementAbbrivation };
    else payload = { ...payload, prd: this.prd, us: this.userStory };
    this.chatService
      .chatWithLLM(this.chatType, payload)
      .then((result: ChatUpdateRequirementResponse) => {
        this.generateLoader = false;
        this.chatHistory = [...this.chatHistory, { assistant: result.response }];
        this.returnChatHistory();
        this.getSuggestion();
        this.analyticsTracker.trackResponseTime(AnalyticsEventSource.AI_CHAT)
      });
  }

  codeLLMCall(fileList: any, content: string) {
    this.generateLoader = true;
    this.chatHistory = [...this.chatHistory, { user: 'Files', list: fileList }];
    const message = `
      Code Snippet:
      ${content}
      -------------
      Improve the requirement context according to the code snippet attached
      -------------`;
    this.finalCall(message);
  }

  update(chat: any) {
    let data = {
      chat,
      chatHistory: this.chatHistory,
    };
    this.getContent.emit(data);
    this.getSuggestion();
  }

  returnChatHistory() {
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
            size: this.formatFileSize(f.size)
          }))
        }];
      } else if (this.selectedFiles.length > 0) {
        // Only files
        this.chatHistory = [...this.chatHistory, { 
          files: this.selectedFiles.map(f => ({
            name: f.name,
            size: this.formatFileSize(f.size)
          }))
        }];
      } else {
        // Only message
        this.chatHistory = [...this.chatHistory, { user: message }];
      }

      // Construct API message
      let apiMessage = '';
      if (message) {
        apiMessage += message + '\n\n';
      }
      if (this.selectedFiles.length > 0) {
        apiMessage += 'Code Snippets:\n';
        apiMessage += this.selectedFilesContent;
      }
      
      this.finalCall(apiMessage);

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
}
