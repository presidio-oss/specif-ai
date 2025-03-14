import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { APP_CONSTANTS } from 'src/app/constants/app.constants';
import { CommonModule } from '@angular/common';
import { ElectronService } from 'src/app/services/electron/electron.service';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-get-username',
  templateUrl: './get-username.component.html',
  styleUrls: ['./get-username.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
})
export class GetUsernameComponent {
  userNameForm = new FormControl('', [Validators.required]);
  errorMessage: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<GetUsernameComponent>,
    private electronService: ElectronService,
    private authService: AuthService,
  ) {
    this.dialogRef.disableClose = true;
  }

  storeName() {
    this.userNameForm.markAsTouched();

    if (this.userNameForm.valid) {
      try {
        const userName = this.userNameForm.value ?? '';
        const newConfig = {
          ...this.electronService.getStoreValue('APP_CONFIG'),
          username: userName,
        };

        this.electronService.setStoreValue('APP_CONFIG', newConfig);
        localStorage.setItem(APP_CONSTANTS.USER_NAME, userName);
        this.authService.setIsLoggedIn(true);

        this.dialogRef.close(userName);
      } catch (error) {
        console.error('Error storing username:', error);
        this.errorMessage = 'Failed to save your username. Please try again.';
      }
    } else {
      this.errorMessage = 'Please enter a valid username address.';
    }
  }
}
