import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MCPServerDetails } from 'src/app/types/mcp.types';
import { McpServersListComponent } from '../mcp/mcp-servers-list/mcp-servers-list.component';

type DialogData = {
  mcpServers: MCPServerDetails[];
  isLoading: boolean;
};

@Component({
  selector: 'app-mcp-servers-modal',
  templateUrl: './mcp-servers-modal.component.html',
  styleUrls: ['./mcp-servers-modal.component.scss'],
  standalone: true,
  imports: [McpServersListComponent],
})
export class McpServersModalComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    private data: DialogData,
  ) {}

  get mcpServers(): DialogData['mcpServers'] {
    return this.data.mcpServers ?? [];
  }

  get isLoading(): boolean {
    return this.data.isLoading ?? false;
  }
}
