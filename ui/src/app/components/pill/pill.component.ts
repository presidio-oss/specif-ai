import { CommonModule, NgClass, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-pill',
  templateUrl: './pill.component.html',
  styleUrls: ['./pill.component.scss'],
  standalone: true,
  imports: [NgIf, NgIcon, NgClass, CommonModule],
  providers: [
    provideIcons({
      heroXMark,
    }),
  ],
})
export class PillComponent {
  @Input() showClear = false;
  @Input() variant: 'primary' | 'secondary' = 'secondary';
  @Input() contentContainerClass: string = '';

  @Output('clear') clearEmitter = new EventEmitter<void>();

  handleClear = () => {
    this.clearEmitter.emit();
  };
}
