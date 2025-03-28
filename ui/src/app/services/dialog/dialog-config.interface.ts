import { DialogPosition } from '@angular/material/dialog';

export interface DialogConfig<T = any> {
  width?: string;
  height?: string;
  position?: DialogPosition;
  disableClose?: boolean;
  data?: T;
  panelClass?: string | string[];
}

export interface ConfirmationDialogData {
  title: string;
  description: string;
  proceedButtonText?: string;
  cancelButtonText?: string;
}

export interface ModalDialogData {
  title: string;
  description?: string;
  extraContext?: string;
  placeholder?: string;
}
