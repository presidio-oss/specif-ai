import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InlineEditDirective } from './inline-edit.directive';
import { InlineEditPromptComponent } from '../../components/inline-edit-prompt/inline-edit-prompt.component';
import { MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIconsModule } from '@ng-icons/core';
import { heroSparklesSolid, heroArrowRightCircleSolid } from '@ng-icons/heroicons/solid';

/**
 * Module for the inline edit functionality
 * Import this module to use the inline edit directive in your components
 */
@NgModule({
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    NgIconsModule.withIcons({ heroSparklesSolid, heroArrowRightCircleSolid }),
    InlineEditDirective,
    InlineEditPromptComponent
  ],
  exports: [
    InlineEditDirective
  ]
})
export class InlineEditModule { }
