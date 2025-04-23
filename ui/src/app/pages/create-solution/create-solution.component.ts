import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { JsonValidator } from '../../validators/json.validator';
import { McpSettingsSchema } from '../../shared/mcp-schemas';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { CreateProject } from '../../store/projects/projects.actions';
import { v4 as uuid } from 'uuid';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { NGXLogger } from 'ngx-logger';
import { DialogService } from '../../services/dialog/dialog.service';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { NgxLoadingModule } from 'ngx-loading';
import { AppSliderComponent } from '../../components/core/slider/slider.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { ErrorMessageComponent } from '../../components/core/error-message/error-message.component';
import {
  APP_CONSTANTS,
  RootRequirementType,
  SOLUTION_CREATION_TOGGLE_MESSAGES,
  REQUIREMENT_COUNT,
} from '../../constants/app.constants';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ToggleComponent } from '../../components/toggle/toggle.component';
import { SettingsComponent } from 'src/app/components/settings/settings.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroChevronDown } from '@ng-icons/heroicons/outline';
import { CustomAccordionComponent } from '../../components/custom-accordion/custom-accordion.component';
import { MCPServerDetails, MCPSettings } from '../../types/mcp.types';
import { McpServersModalComponent } from 'src/app/components/mcp-servers-modal/mcp-servers-modal.component';

@Component({
  selector: 'app-create-solution',
  templateUrl: './create-solution.component.html',
  styleUrls: ['./create-solution.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    ReactiveFormsModule,
    NgxLoadingModule,
    ButtonComponent,
    ErrorMessageComponent,
    InputFieldComponent,
    TextareaFieldComponent,
    ToggleComponent,
    AppSliderComponent,
    NgIconComponent,
    NgClass,
    CustomAccordionComponent
  ],
  viewProviders: [provideIcons({ heroChevronDown })],
})
export class CreateSolutionComponent implements OnInit {
  solutionForm!: FormGroup;
  loading: boolean = false;
  validatingMCPSettings: boolean = false;
  addOrUpdate: boolean = false;
  
  validatedServerStatuses: MCPServerDetails[] = [];
  areMCPServersValidated: boolean = true;

  logger = inject(NGXLogger);
  appSystemService = inject(AppSystemService);
  electronService = inject(ElectronService);
  toast = inject(ToasterService);
  readonly dialogService = inject(DialogService);
  router = inject(Router);
  store = inject(Store);

  ngOnInit() {
    this.solutionForm = this.createSolutionForm();
    this.store.dispatch(
      new AddBreadcrumbs([
        {
          label: 'Create',
          url: '/create',
        },
      ]),
    );
  }

  showGenerationPreferencesTab(): boolean {
    return !this.solutionForm.get('cleanSolution')?.value;
  }

  private initRequirementGroup(enabled: boolean = true, maxCount: number = REQUIREMENT_COUNT.DEFAULT) {
    return {
      enabled: new FormControl(enabled),
      maxCount: new FormControl(maxCount, {
        validators: [
          Validators.required,
          Validators.min(0),
          Validators.max(REQUIREMENT_COUNT.MAX),
        ],
        updateOn: 'change'
      }),
    };
  }

  createSolutionForm() {
    const solutionFormGroup = new FormGroup({
      id: new FormControl(uuid()),
      name: new FormControl('', [
        Validators.required,
        Validators.pattern(/\S/),
      ]),
      description: new FormControl('', [
        Validators.required,
        Validators.pattern(/\S/),
      ]),
      technicalDetails: new FormControl('', [
        Validators.required,
        Validators.pattern(/\S/),
      ]),
      createReqt: new FormControl(true),
      createdAt: new FormControl(new Date().toISOString()),
      cleanSolution: new FormControl(false),
      BRD: new FormGroup(this.initRequirementGroup()),
      PRD: new FormGroup(this.initRequirementGroup()),
      UIR: new FormGroup(this.initRequirementGroup()),
      NFR: new FormGroup(this.initRequirementGroup()),
      mcpSettings: new FormControl('{"mcpServers": {}}', [Validators.required, JsonValidator, this.mcpSettingsValidator]),
    });

    solutionFormGroup.get('mcpSettings')?.valueChanges.subscribe(() => {
      this.onMcpSettingsChange();
    });

    return solutionFormGroup;
  }

  onMcpSettingsChange() {
    this.areMCPServersValidated = false;
  }

  async validateMcpSettings() {
    if (this.solutionForm.get('mcpSettings')?.invalid) {
      this.toast.showError('Invalid MCP settings. Please correct the errors before validating.');
      return;
    }

    this.validatingMCPSettings = true;

    try {
      const mcpSettings = JSON.parse(this.solutionForm.get('mcpSettings')?.value) as MCPSettings;
      this.validatedServerStatuses = await this.electronService.validateMCPSettings(mcpSettings);
      this.areMCPServersValidated = true;
      this.toast.showSuccess('MCP settings validated successfully');
      
      const failedConnectingToSomeServers = this.validatedServerStatuses.some(server => server.status === 'error');
      if (failedConnectingToSomeServers) {
        this.toast.showWarning('There are issues connecting to some MCP servers. Click "View MCP Servers" for details.');
      }
    } catch (error) {
      console.error('Error validating MCP servers:', error);
      this.validatedServerStatuses = [];
      this.areMCPServersValidated = false;
      this.toast.showError('Failed to validate MCP settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      this.validatingMCPSettings = false;
    }
  }

  openMcpServersDialog() {
    this.dialogService
      .createBuilder()
      .forComponent(McpServersModalComponent)
      .withData({
        mcpServers: this.validatedServerStatuses,
        isLoading: this.validatingMCPSettings,
      })
      .withWidth("800px")
      .withHeight("80%")
      .open();
  }

  hasMcpServerErrors(): boolean {
    return this.validatedServerStatuses.some(server => server.status === 'error');
  }

  mcpSettingsValidator(control: AbstractControl): ValidationErrors | null {
    try {
      const mcpSettings = JSON.parse(control.value);
      const validationResult = McpSettingsSchema.safeParse(mcpSettings);
      if (!validationResult.success) {
        return { invalidMcpSettings: true };
      }
    } catch (error) {
      return { invalidMcpSettings: true };
    }
    return null;
  }

  onRequirementToggle(type: RootRequirementType, enabled: boolean) {
    const requirementGroup = this.solutionForm.get(type);
    if (!requirementGroup) return;
    
    // Always set a valid maxCount value whether enabled or disabled
    const maxCount = enabled ? REQUIREMENT_COUNT.DEFAULT : 0;
    requirementGroup.patchValue({
      enabled,
      maxCount
    });
    
    // Ensure the control is marked as touched to trigger validation
    requirementGroup.get('maxCount')?.markAsTouched();
    requirementGroup.get('enabled')?.markAsTouched();
    requirementGroup.updateValueAndValidity();
  }

  async createSolution() {
    let isRootDirectorySet = localStorage.getItem(APP_CONSTANTS.WORKING_DIR);
    if (isRootDirectorySet === null || isRootDirectorySet === '') {
      this.openSelectRootDirectoryModal();
      return;
    }

    let isPathValid = await this.appSystemService.fileExists('');
    if (!isPathValid) {
      this.toast.showError('Please select a valid root directory.');
      return;
    }

    if (!this.areMCPServersValidated) {
      this.toast.showError('Please validate MCP settings before creating the solution.');
      return;
    }

    if (
      this.solutionForm.valid &&
      isRootDirectorySet !== null &&
      isRootDirectorySet !== '' &&
      isPathValid &&
      this.areMCPServersValidated
    ) {
      this.addOrUpdate = true;
      const data = this.solutionForm.getRawValue();
      data.createReqt = !data.cleanSolution;

      try {
        data.mcpSettings = JSON.parse(data.mcpSettings);
      } catch (error) {
        this.toast.showError('Invalid JSON in MCP Settings');
        return;
      }

      this.store.dispatch(new CreateProject(data.name, data));
    }
  }

  get isCreateSolutionDisabled(): boolean {
    return this.loading || this.solutionForm.invalid || !this.areMCPServersValidated || this.validatingMCPSettings;
  }

  openSelectRootDirectoryModal() {
    this.dialogService
      .createBuilder()
      .forComponent(SettingsComponent)
      .disableClose()
      .open();
  }

  async selectRootDirectory(): Promise<void> {
    const response = await this.electronService.openDirectory();
    this.logger.debug(response);
    if (response.length > 0) {
      localStorage.setItem(APP_CONSTANTS.WORKING_DIR, response[0]);
      await this.createSolution();
    }
  }

  get isTechnicalDetailsInvalid(): boolean {
    const field = this.solutionForm?.get('technicalDetails');
    return !!field?.invalid && (!!field?.dirty || !!field?.touched);
  }

  get isTechnicalDetailsRequiredError(): boolean {
    return 'required' in this.solutionForm?.get('technicalDetails')?.errors!;
  }

  canDeactivate(): boolean {
    return (
      this.solutionForm.dirty && this.solutionForm.touched && !this.addOrUpdate
    );
  }

  getSolutionToggleDescription(): string {
    return this.solutionForm.get('cleanSolution')?.value
      ? SOLUTION_CREATION_TOGGLE_MESSAGES.BROWNFIELD_SOLUTION
      : SOLUTION_CREATION_TOGGLE_MESSAGES.GREENFIELD_SOLUTION;
  }

  navigateToDashboard() {
    this.router.navigate(['/apps']);
  }

  protected readonly FormControl = FormControl;

  get isMcpSettingsInvalid(): boolean {
    const field = this.solutionForm?.get('mcpSettings');
    return !!field?.invalid && (!!field?.dirty || !!field?.touched);
  }

  get isMcpSettingsJsonInvalid(): boolean {
    return this.solutionForm?.get('mcpSettings')?.hasError('jsonInvalid') ?? false;
  }

  get isMcpSettingsSchemaInvalid(): boolean {
    return this.solutionForm?.get('mcpSettings')?.hasError('invalidMcpSettings') ?? false;
  }
}
