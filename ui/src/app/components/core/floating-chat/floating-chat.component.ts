import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { NgClass, NgIf, NgForOf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroChevronDown,
  heroChevronUp,
  heroXMark,
  heroPaperAirplane,
  heroPaperClip,
  heroArrowsPointingOut,
  heroArrowsPointingIn,
} from '@ng-icons/heroicons/outline';
import { heroSparklesSolid } from '@ng-icons/heroicons/solid';
import { AiChatComponent } from '../../ai-chat/ai-chat.component';
import { SectionInfo, EditProposal } from '../canvas-editor/canvas-editor.component';

@Component({
  selector: 'app-floating-chat',
  templateUrl: './floating-chat.component.html',
  styleUrls: ['./floating-chat.component.scss'],
  standalone: true,
  imports: [
    NgClass,
    NgIf,
    NgForOf,
    AsyncPipe,
    FormsModule,
    NgIcon,
    MatTooltipModule,
    AiChatComponent
  ],
  providers: [
    provideIcons({
      heroChevronDown,
      heroChevronUp,
      heroXMark,
      heroPaperAirplane,
      heroPaperClip,
      heroArrowsPointingOut,
      heroArrowsPointingIn,
      heroSparklesSolid
    })
  ]
})
export class FloatingChatComponent implements OnInit, OnDestroy {
  @Input() chatType: string = 'requirement';
  @Input() fileName: string = '';
  @Input() name: string = '';
  @Input() description: string = '';
  @Input() baseContent: string = '';
  @Input() chatHistory: any = [];
  @Input() selectedSection: SectionInfo | null = null;
  
  @Output() chatHistoryChange = new EventEmitter<any>();
  @Output() editProposed = new EventEmitter<EditProposal>();
  
  isMinimized: boolean = false;
  isExpanded: boolean = false;
  message: string = '';
  
  constructor() {}
  
  ngOnInit(): void {}
  
  ngOnDestroy(): void {}
  
  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.isExpanded = false;
    }
  }
  
  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }
  
  updateChatHistory(chatHistory: any): void {
    this.chatHistory = chatHistory;
    this.chatHistoryChange.emit(chatHistory);
  }
  
  handleContentAddition(data: any): void {
    const { chat, chatHistory } = data;
    
    if (chat.contentToAdd) {
      // Determine the type of edit based on the presence of sectionToReplace
      const editProposal: EditProposal = {
        type: chat.sectionToReplace ? 'section' : 
              chat.isFullReplacement ? 'full' : 'append',
        content: chat.contentToAdd,
        sectionToReplace: chat.sectionToReplace
      };
      
      // Emit the edit proposal for approval
      this.editProposed.emit(editProposal);
      
      // Mark the content as added in chat history
      const updatedChatHistory = chatHistory.map((item: any) => {
        if (item.name === chat.tool_name && item.tool_call_id === chat.tool_call_id) {
          return { ...item, isAdded: true };
        } else {
          return item;
        }
      });
      
      this.updateChatHistory(updatedChatHistory);
    }
  }
  
  sendMessage(): void {
    if (!this.message.trim()) return;
    
    // If a section is selected, include that context in the message
    if (this.selectedSection) {
      const sectionContext = `I'm currently working on the "${this.selectedSection.title}" section of the document. `;
      this.message = sectionContext + this.message;
    }
    
    // Add the message to chat history and clear the input
    this.chatHistory = [...this.chatHistory, { user: this.message }];
    this.chatHistoryChange.emit(this.chatHistory);
    this.message = '';
  }
}
