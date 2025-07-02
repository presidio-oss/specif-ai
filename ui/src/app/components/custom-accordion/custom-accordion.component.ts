import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CommonModule, NgClass } from '@angular/common';

@Component({
  selector: 'app-custom-accordion',
  templateUrl: './custom-accordion.component.html',
  styleUrls: ['./custom-accordion.component.scss'],
  standalone: true,
  imports: [NgIcon, CommonModule, NgClass]
})
export class CustomAccordionComponent {
  @Input() id!: string;
  @Input() isOpen = false;
  @Input() triggerClassName = '';
  @Input() bodyClassName = '';
  @Output() toggleChange = new EventEmitter<boolean>();

  toggle() {
    this.isOpen = !this.isOpen;
    this.toggleChange.emit(this.isOpen);
  }
}
