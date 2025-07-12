import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InlineEditControlsComponent } from '../../components/shared/inline-edit-controls/inline-edit-controls.component';
import { InlineEditableDirective } from '../../directives/inline-editable.directive';
import { InlineEditService } from '../../services/inline-edit/inline-edit.service';
import { InlineEditManagerService } from '../../services/inline-edit/inline-edit-manager.service';
import { InlineEditComponent } from '../../components/shared/inline-edit/inline-edit.component';

/**
 * Inline Edit Module
 * 
 * This module provides a comprehensive solution for adding AI-powered inline text editing 
 * to any Angular application.
 * 
 * Features:
 * - Directive for making any text element inline-editable
 * - Controls component for handling user interaction
 * - Services for managing editor adapters and communication with AI
 * 
 * Usage:
 * 1. Import InlineEditModule in your feature module
 * 2. Use [appInlineEditable] directive on text elements
 * 3. Add <app-inline-edit-controls> component for UI controls
 * 4. Or use the traditional <app-inline-edit> component for compatibility
 */
@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    InlineEditControlsComponent,
    InlineEditableDirective,
    InlineEditComponent
  ],
  exports: [
    InlineEditControlsComponent,
    InlineEditableDirective,
    InlineEditComponent
  ],
  providers: [
    InlineEditService,
    InlineEditManagerService
  ]
})
export class InlineEditModule { }
