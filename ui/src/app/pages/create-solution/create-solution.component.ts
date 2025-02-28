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
import { ElectronService } from '../../services/electron/electron.service';
import { ToasterService } from '../../services/toaster/toaster.service';
import { SelectRootDirectoryComponent } from '../../components/select-root-directory/select-root-directory.component';
import { NgIf } from '@angular/common';
import { NgxLoadingModule } from 'ngx-loading';
import { AppSliderComponent } from '../../components/core/slider/slider.component';
import { ButtonComponent } from '../../components/core/button/button.component';
import { ErrorMessageComponent } from '../../components/core/error-message/error-message.component';
import {
  APP_CONSTANTS,
  SOLUTION_CREATION_TOGGLE_MESSAGES,
} from '../../constants/app.constants';
import { InputFieldComponent } from '../../components/core/input-field/input-field.component';
import { TextareaFieldComponent } from '../../components/core/textarea-field/textarea-field.component';
import { ToggleComponent } from '../../components/toggle/toggle.component';
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
  ],
})
export class CreateSolutionComponent implements OnInit {
  solutionForm!: FormGroup;
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

  createSolutionForm() {
    return new FormGroup({
      name: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
      technicalDetails: new FormControl('', Validators.required),
      createReqt: new FormControl(true),
      id: new FormControl(uuid()),
      createdAt: new FormControl(new Date().toISOString()),
      cleanSolution: new FormControl(false),
      brd: new FormControl(15, [
        Validators.required,
        Validators.min(0),
        Validators.max(30),
      ]),
      prd: new FormControl(15, [
        Validators.required,
        Validators.min(0),
        Validators.max(30),
      ]),
      uir: new FormControl(15, [
        Validators.required,
        Validators.min(0),
        Validators.max(30),
      ]),
      nfr: new FormControl(15, [
        Validators.required,
        Validators.min(0),
        Validators.max(30),
      ]),
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
      const data = this.solutionForm.getRawValue();
      this.store.dispatch(new CreateProject(data.name, data));
    }
  }

  openSelectRootDirectoryModal() {
    const modalRef = this.dialog.open(SelectRootDirectoryComponent, {
      disableClose: true,
    });
    modalRef.afterClosed().subscribe((res) => {
      if (res === true) {
        this.selectRootDirectory().then();
      }
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
