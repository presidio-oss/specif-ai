import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
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
import { NgIf } from '@angular/common';
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
import { provideIcons } from '@ng-icons/core';
import { heroChevronDown } from '@ng-icons/heroicons/outline';
import { CustomAccordionComponent } from '../../components/custom-accordion/custom-accordion.component';
import { McpIntegrationConfiguratorComponent } from '../../components/mcp-integration-configurator/mcp-integration-configurator.component';

@Component({
  selector: 'app-create-solution',
  templateUrl: './create-solution.component.html',
  styleUrls: ['./create-solution.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    NgxLoadingModule,
    ButtonComponent,
    ErrorMessageComponent,
    InputFieldComponent,
    TextareaFieldComponent,
    ToggleComponent,
    AppSliderComponent,
    CustomAccordionComponent,
    McpIntegrationConfiguratorComponent
  ],
  viewProviders: [provideIcons({ heroChevronDown })],
})
export class CreateSolutionComponent implements OnInit {
  solutionForm!: FormGroup;
  loading: boolean = false;
  addOrUpdate: boolean = false;
  
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

  private initRequirementGroup(enabled: boolean = true, minCount: number = REQUIREMENT_COUNT.DEFAULT) {
    return {
      enabled: new FormControl(enabled),
      minCount: new FormControl(minCount, {
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
      mcpSettings: new FormControl({ mcpServers: {} }, [Validators.required]),
    });

    return solutionFormGroup;
  }

  onRequirementToggle(type: RootRequirementType, enabled: boolean) {
    const requirementGroup = this.solutionForm.get(type);
    if (!requirementGroup) return;
    
    // Always set a valid minCount value whether enabled or disabled
    const minCount = enabled ? REQUIREMENT_COUNT.DEFAULT : 0;
    requirementGroup.patchValue({
      enabled,
      minCount
    });
    
    // Ensure the control is marked as touched to trigger validation
    requirementGroup.get('minCount')?.markAsTouched();
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

    if (
      this.solutionForm.valid &&
      isRootDirectorySet !== null &&
      isRootDirectorySet !== '' &&
      isPathValid
    ) {
      this.addOrUpdate = true;
      const data = this.solutionForm.getRawValue();
      data.createReqt = !data.cleanSolution;

      this.store.dispatch(new CreateProject(data.name, data)).subscribe({
        next: () => {
          this.toast.showSuccess('All set! Your solution is ready to roll.');
        },
        error: (error) => {
          this.addOrUpdate = false;
          this.toast.showError(error.message);
        },
      });
    }
  }

  get isCreateSolutionDisabled(): boolean {
    return this.loading || this.solutionForm.invalid;
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
