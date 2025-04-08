import { Injectable, Type } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from './dialog-config.interface';

@Injectable({
  providedIn: 'root',
})
export class DialogBuilder<T = any, R = any> {
  private config: DialogConfig<T> = {};
  private component!: Type<any>;

  constructor(private dialog: MatDialog) {}

  forComponent(component: Type<any>): DialogBuilder<T, R> {
    this.component = component;
    return this;
  }

  withConfig(config: DialogConfig<T>): DialogBuilder<T, R> {
    this.config = { ...this.config, ...config };
    return this;
  }

  withData(data: T): DialogBuilder<T, R> {
    this.config.data = data;
    return this;
  }

  withWidth(width: string): DialogBuilder<T, R> {
    this.config.width = width;
    return this;
  }

  withHeight(height: string): DialogBuilder<T, R> {
    this.config.height = height;
    return this;
  }

  withPosition(position: { top?: string; left?: string }): DialogBuilder<T, R> {
    this.config.position = position;
    return this;
  }

  disableClose(disable: boolean = true): DialogBuilder<T, R> {
    this.config.disableClose = disable;
    return this;
  }

  withPanelClass(panelClass: string | string[]): DialogBuilder<T, R> {
    this.config.panelClass = panelClass;
    return this;
  }

  open(): MatDialogRef<any, R> {
    if (!this.component) {
      throw new Error(
        'Dialog component must be specified using forComponent()',
      );
    }
    return this.dialog.open(this.component, this.config);
  }
}
