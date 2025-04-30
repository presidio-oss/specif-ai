import {
  NgClass,
  NgForOf,
  NgIf,
  NgSwitch,
  NgSwitchCase,
  NgTemplateOutlet,
} from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronDown } from '@ng-icons/heroicons/outline';
import { MCPServerDetails } from '../../../types/mcp.types';
import { CustomAccordionComponent } from '../../custom-accordion/custom-accordion.component';

@Component({
  selector: 'app-mcp-servers-item',
  templateUrl: './mcp-servers-list-item.component.html',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    NgClass,
    NgTemplateOutlet,
    NgSwitch,
    NgSwitchCase,
    CustomAccordionComponent,
  ],
  viewProviders: [provideIcons({ heroChevronDown })],
})
export class McpServersListItemComponent {
  @Input() server!: MCPServerDetails;
  activeTab: 'tools' | 'resources' = 'tools';

  get toolsAndResources(): { tools: any[]; resources: any[] } {
    return {
      tools: this.server.tools || [],
      resources: this.server.resources || [],
    };
  }
}
