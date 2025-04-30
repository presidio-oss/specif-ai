import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MCPServerDetails, MCPServerOptions } from 'src/app/types/mcp.types';
import { ElectronService } from '../../../electron-bridge/electron.service';
import { ToasterService } from '../../../services/toaster/toaster.service';
import {
  McpServerOptionsSchema,
  McpSettingsSchema,
} from '../../../shared/mcp-schemas';
import { JsonValidator } from '../../../validators/json.validator';
import { ButtonComponent } from '../../core/button/button.component';
import { InputFieldComponent } from '../../core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../core/textarea-field/textarea-field.component';
import { McpServersListItemComponent } from '../../mcp/mcp-servers-list-item/mcp-servers-list-item.component';
import { ZodError } from 'zod';

@Component({
  selector: 'app-new-mcp-server',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    TextareaFieldComponent,
    InputFieldComponent,
    McpServersListItemComponent,
  ],
  templateUrl: './new-mcp-server.component.html',
  styleUrls: ['./new-mcp-server.component.scss'],
})
export class NewMcpServerComponent implements OnInit {
  form!: FormGroup;
  isValidated = false;
  isValidating = false;
  validatedServerStatus: MCPServerDetails | null = null;
  showServerInformation = true;

  private stdioServerDownloadUrl: string | null = null;
  private sseServerDownloadUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private electronService: ElectronService,
    private toasterService: ToasterService,
    public dialogRef: MatDialogRef<NewMcpServerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { server?: MCPServerDetails, id?: string; },
  ) {}

  sampleStdioServerConfig = {
    command: "uvx",
    args: ["awslabs.bedrock-kb-retrieval-mcp-server@latest"],
    env: {
      AWS_PROFILE: "your-profile-name",
      AWS_REGION: "us-east-1",
      FASTMCP_LOG_LEVEL: "ERROR",
      KB_INCLUSION_TAG_KEY: "optional-tag-key-to-filter-kbs"
    },
    disabled: false,
    name: "AWS Bedrock Knowledge Base",
    transportType: "stdio"
  };

  sampleSseServerConfig = {
    name: "Sample SSE Server",
    disabled: false,
    url: "https://sample-domain.com/sse",
    transportType: "sse"
  };

  ngOnInit() {
    this.createForm();
    if (this.data.server) {
      this.form.patchValue({
        serverId: this.data.id ?? this.data.server.id,
        serverConfig: JSON.stringify(this.data.server, null, 2),
      });
      this.validatedServerStatus = this.data.server;
      this.isValidated = true;
      this.showServerInformation = false;
    }

    this.form.valueChanges.subscribe(() => {
      this.isValidated = false;
      this.validatedServerStatus = null;
      this.showServerInformation = true;
    });
  }

  async onServerConfigPaste(event: ClipboardEvent) {
    const pastedContent = event.clipboardData?.getData('text');
    if (pastedContent) {
      const parsedContent = await this.parseMcpSettings(pastedContent);
      if (parsedContent) {
        event.preventDefault();
        this.form.patchValue({
          serverId: parsedContent.serverId,
          serverConfig: JSON.stringify(parsedContent.serverConfig, null, 2),
        });
      }
    }
  }

  async parseMcpSettings(
    value: string,
  ): Promise<{ serverId: string; serverConfig: MCPServerOptions } | null> {
    try {
      const parsedValue = JSON.parse(value);
      const mcpSettingsResult = await McpSettingsSchema.parseAsync(parsedValue);

      if (mcpSettingsResult.mcpServers) {
        const [serverId, serverConfig] = Object.entries(
          mcpSettingsResult.mcpServers,
        )[0];
        return { serverId, serverConfig };
      }

      return null;
    } catch (error) {
      console.error((error as ZodError).errors);
      return null;
    }
  }

  createForm() {
    this.form = this.fb.group({
      serverId: [
        '',
        [Validators.required, Validators.pattern(/^[a-zA-Z0-9-_.]+$/)],
      ],
      serverConfig: [
        '',
        [Validators.required, JsonValidator, this.serverConfigValidator],
      ],
    });
  }

  serverConfigValidator(control: AbstractControl): ValidationErrors | null {
    try {
      const serverConfig = JSON.parse(control.value);
      const validationResult = McpServerOptionsSchema.safeParse(serverConfig);
      if (!validationResult.success) {
        return { invalidServerConfig: true };
      }
    } catch (error) {
      return { invalidServerConfig: true };
    }
    return null;
  }

  async onValidate() {
    if (this.form.invalid) {
      this.toasterService.showError(
        'Please enter a valid server ID and MCP server configuration JSON before validating.',
      );
      return;
    }

    this.isValidating = true;
    try {
      const serverId = this.form.get('serverId')?.value;
      const serverConfig = JSON.parse(
        this.form.get('serverConfig')?.value,
      ) as MCPServerOptions;
      const validationResult = await this.electronService.validateMCPSettings({
        mcpServers: { [serverId]: serverConfig },
      });
      this.validatedServerStatus = validationResult[0];
      this.isValidated = true;
      this.showServerInformation = true;

      if (this.validatedServerStatus.status === 'connected') {
        this.toasterService.showSuccess('MCP server validated successfully.');
      } else {
        this.toasterService.showWarning(
          'There are issues connecting to the MCP server. Please check the details.',
        );
      }
    } catch (error) {
      this.toasterService.showError(
        'Failed to validate MCP server: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    } finally {
      this.isValidating = false;
    }
  }

  onSubmit() {
    if (this.form.valid && this.isValidated && this.validatedServerStatus) {
      const serverId = this.form.get('serverId')?.value;
      const serverConfig = JSON.parse(this.form.get('serverConfig')?.value);
      this.dialogRef.close({
        ...serverConfig,
        id: serverId,
      });
    } else if (!this.isValidated) {
      this.toasterService.showError(
        'Please validate the MCP server before submitting.',
      );
    }
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  getStdioServerDownloadUrl(): string {
    if (!this.stdioServerDownloadUrl) {
      const blob = new Blob([JSON.stringify(this.sampleStdioServerConfig, null, 2)], { type: 'application/json' });
      this.stdioServerDownloadUrl = URL.createObjectURL(blob);
    }
    return this.stdioServerDownloadUrl;
  }

  getSseServerDownloadUrl(): string {
    if (!this.sseServerDownloadUrl) {
      const blob = new Blob([JSON.stringify(this.sampleSseServerConfig, null, 2)], { type: 'application/json' });
      this.sseServerDownloadUrl = URL.createObjectURL(blob);
    }
    return this.sseServerDownloadUrl;
  }

  ngOnDestroy() {
    // Revoke object URLs to free up memory
    if (this.stdioServerDownloadUrl) {
      URL.revokeObjectURL(this.stdioServerDownloadUrl);
    }
    if (this.sseServerDownloadUrl) {
      URL.revokeObjectURL(this.sseServerDownloadUrl);
    }
  }

  get isServerIdInvalid(): boolean {
    const field = this.form?.get('serverId');
    return !!field?.invalid && (!!field?.dirty || !!field?.touched);
  }

  get isServerConfigInvalid(): boolean {
    const field = this.form?.get('serverConfig');
    return !!field?.invalid && (!!field?.dirty || !!field?.touched);
  }

  get isServerConfigJsonInvalid(): boolean {
    return (
      (this.isServerConfigInvalid &&
        this.form?.get('serverConfig')?.hasError('jsonInvalid')) ??
      false
    );
  }

  get isServerConfigSchemaInvalid(): boolean {
    return (
      (this.isServerConfigInvalid &&
        this.form?.get('serverConfig')?.hasError('invalidServerConfig')) ??
      false
    );
  }
}
