import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { ButtonComponent } from '../core/button/button.component';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  standalone: true,
  imports: [NgIf, ButtonComponent],
})
export class EmptyStateComponent {
  @Input()
  heading: string = '';
  @Input()
  description: string = '';
  @Input()
  buttonText: string = '';
  @Input()
  imageSrc: string = '';
  @Output()
  buttonClick = new EventEmitter<void>();

  onButtonClick(): void {
    this.buttonClick.emit();
  }
}
