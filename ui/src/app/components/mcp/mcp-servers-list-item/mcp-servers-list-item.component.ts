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
    NgIconComponent,
  ],
  viewProviders: [provideIcons({ heroChevronDown })],
})
export class McpServersListItemComponent {
  // @ts-expect-error
  @Input() server: MCPServerDetails;
  isExpanded = false;
  activeTab: 'tools' | 'resources' = 'tools';

  toggleAccordion() {
    this.isExpanded = !this.isExpanded;
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  get toolsAndResources(): { tools: any[]; resources: any[] } {
    return {
      tools: this.server.tools || [],
      resources: this.server.resources || [],
    };
  }
}
