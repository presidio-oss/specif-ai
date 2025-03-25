import {
  booleanAttribute,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { SetChatSettings } from '../../store/chat-settings/chat-settings.action';
import { Observable } from 'rxjs';
import { ChatSettings } from '../../model/interfaces/ChatSettings';
import { ChatSettingsState } from '../../store/chat-settings/chat-settings.state';
import { Store } from '@ngxs/store';
import { NgClass } from '@angular/common';
import { ProjectsState } from '../../store/projects/projects.state';

@Component({
  selector: 'app-toggle',
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss'],
  imports: [NgClass],
  standalone: true,
})
export class ToggleComponent implements OnInit {
  constructor(private store: Store) {}
  @Input({ transform: booleanAttribute }) isActive: boolean = false;
  @Output() toggleChange = new EventEmitter<boolean>();
  @Input({ transform: booleanAttribute }) isPlainToggle: boolean = false;
  chatSettings$: Observable<ChatSettings> = this.store.select(
    ChatSettingsState.getConfig,
  );
  currentSettings!: ChatSettings;
  metadata: any = {};

  ngOnInit(): void {
    if (!this.isPlainToggle) {
      this.chatSettings$.subscribe((settings) => {
        this.currentSettings = settings;
      });
      this.isActive = this.currentSettings?.kb !== '';
      this.store.select(ProjectsState.getMetadata).subscribe((res) => {
        this.metadata = res;
      });
    }
  }

  toggle() {
    this.isActive = !this.isActive;
    this.toggleChange.emit(this.isActive);
    if (!this.isPlainToggle) {
      this.store.dispatch(
        new SetChatSettings({
          ...this.currentSettings,
          kb: this.isActive ? this.metadata.integration.bedrock.kbId : '',
          accessKey: this.isActive ? this.metadata.integration.bedrock.accessKey : '',
          secretKey: this.isActive ? this.metadata.integration.bedrock.secretKey : '',
          region: this.isActive ? this.metadata.integration.bedrock.region : '',
          sessionKey: this.isActive ? this.metadata.integration.bedrock.sessionKey: ''
        }),
      );
    }
  }
}
