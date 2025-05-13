import { Component, Input } from '@angular/core';
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

  toggle() {
    this.isOpen = !this.isOpen;
  }
}
