import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MCPServerDetails, PredefinedMCPIntegration, FormField } from 'src/app/types/mcp.types';
import { ElectronService } from '../../../electron-bridge/electron.service';
import { ToasterService } from '../../../services/toaster/toaster.service';
import { ButtonComponent } from '../../core/button/button.component';
import { InputFieldComponent } from '../../core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../core/textarea-field/textarea-field.component';
import { McpServersListItemComponent } from '../../mcp/mcp-servers-list-item/mcp-servers-list-item.component';

@Component({
  selector: 'app-predefined-mcp-server',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    InputFieldComponent,
    TextareaFieldComponent,
    McpServersListItemComponent,
  ],
  templateUrl: './predefined-mcp-server.component.html',
  styleUrls: ['./predefined-mcp-server.component.scss'],
})
export class PredefinedMcpServerComponent implements OnInit {
  form!: FormGroup;
  isValidated = false;
  isValidating = false;
  showServerInformation = true;
  validatedServerStatus: MCPServerDetails | null = null;

  constructor(
    private fb: FormBuilder,
    private electronService: ElectronService,
    private toasterService: ToasterService,
    public dialogRef: MatDialogRef<PredefinedMcpServerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { integration: PredefinedMCPIntegration<FormField[]>, existingServer?: MCPServerDetails },
  ) {}

  ngOnInit() {
    this.createForm();
    if (this.data.existingServer) {
      this.patchFormWithExistingData();
      this.isValidated = true;
      this.showServerInformation = false;
    }

    this.form.valueChanges.subscribe(() => {
      this.isValidated = false;
      this.validatedServerStatus = null;
      this.showServerInformation = true;
    });
  }

  createForm() {
    const formConfig: { [key: string]: any } = {};
    this.data.integration.formFields.forEach((field) => {
      formConfig[field.name] = [field.default || '', field.required ? Validators.required : []];
    });
    this.form = this.fb.group(formConfig);
  }

  patchFormWithExistingData() {
    if (this.data.existingServer) {
      const formData = this.data.integration.buildFormDataFromConfig(this.data.existingServer);
      this.form.patchValue(formData);
    }
  }

  async onValidate() {
    if (this.form.invalid) {
      this.toasterService.showError('Please fill all required fields before validating.');
      return;
    }

    this.isValidating = true;
    try {
      const formData = this.form.value;
      const config = this.data.integration.buildConfig(formData);
      const validationResult = await this.electronService.validateMCPSettings({ mcpServers: { [this.data.integration.id]: config } });
      this.validatedServerStatus = validationResult[0];
      this.isValidated = true;
      this.showServerInformation = true;
      
      if (this.validatedServerStatus.status === 'connected') {
        this.toasterService.showSuccess('MCP server validated successfully.');
      } else {
        this.toasterService.showWarning('There are issues connecting to the MCP server. Please check the details.');
      }
    } catch (error) {
      this.toasterService.showError('Failed to validate MCP server: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      this.isValidating = false;
    }
  }

  onSubmit() {
    if (this.form.valid && this.isValidated && this.validatedServerStatus) {
      const formData = this.form.value;
      const config = this.data.integration.buildConfig(formData);
      this.dialogRef.close({
        id: this.data.integration.id,
        ...config
      })
    } else if (!this.isValidated) {
      this.toasterService.showError('Please validate the MCP server before submitting.');
    }
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'This field is required.';
    }
    return '';
  }
}
