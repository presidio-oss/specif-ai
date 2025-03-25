import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { CreateProject } from '../../store/projects/projects.actions';
import { v4 as uuid } from 'uuid';
import { AddBreadcrumbs } from '../../store/breadcrumb/breadcrumb.actions';
import { MatDialog } from '@angular/material/dialog';
import { NGXLogger } from 'ngx-logger';
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
} from '../../constants/app.constants';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ToggleComponent } from '../../components/toggle/toggle.component';
import { SettingsComponent } from 'src/app/components/settings/settings.component';
import { MultiUploadComponent } from 'src/app/components/multi-upload/multi-upload.component';

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
    MultiUploadComponent,
  ],
})
export class CreateSolutionComponent implements OnInit {
  solutionForm!: FormGroup;
  uploadedFileContent: string = '';
  loading: boolean = false;
  addOrUpdate: boolean = false;

  logger = inject(NGXLogger);
  appSystemService = inject(AppSystemService);
  electronService = inject(ElectronService);
  toast = inject(ToasterService);
  readonly dialog = inject(MatDialog);
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

  private initRequirementGroup(enabled: boolean = true, maxCount: number = 15) {
    return {
      enabled: new FormControl(enabled),
      maxCount: new FormControl(maxCount, [
        Validators.required,
        Validators.min(0),
        Validators.max(30),
      ]),
    };
  }

  createSolutionForm() {
    return new FormGroup({
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
      id: new FormControl(uuid()),
      createdAt: new FormControl(new Date().toISOString()),
      cleanSolution: new FormControl(false),
      BRD: new FormGroup(this.initRequirementGroup()),
      PRD: new FormGroup(this.initRequirementGroup()),
      UIR: new FormGroup(this.initRequirementGroup()),
      NFR: new FormGroup(this.initRequirementGroup()),
    });
  }

  onRequirementToggle(type: RootRequirementType, enabled: boolean) {
    const requirementGroup = this.solutionForm.get(type);
    if (!requirementGroup) return;
    requirementGroup.patchValue({
      enabled,
      maxCount: enabled ? 15 : 0,
    });
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
      let data = this.solutionForm.getRawValue();
      data = {
        ...data,
        refDocContent: this.uploadedFileContent,
      };
      this.store.dispatch(new CreateProject(data.name, data));
    }
  }

  openSelectRootDirectoryModal() {
    this.dialog.open(SettingsComponent, {
      disableClose: true,
    });
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

  handleFileContent(content: string) {
    this.uploadedFileContent = content;
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
}
