import { Component, Input } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { McpServersListItemComponent } from '../mcp-servers-list-item/mcp-servers-list-item.component';
import { MCPServerDetails } from '../../../types/mcp.types';

@Component({
  selector: 'app-mcp-servers',
  templateUrl: './mcp-servers-list.component.html',
  standalone: true,
  imports: [NgForOf, NgIf, McpServersListItemComponent]
})
export class McpServersListComponent {
  @Input() mcpServers: MCPServerDetails[] = [];
  @Input() isLoading = false;

  @Input() heading = "Model Context Protocol (MCP) Servers";
  @Input() subHeading = "View your connected MCP servers and their capabilities";
  @Input() showHeading = true;
}
