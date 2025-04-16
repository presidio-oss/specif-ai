import { Component, Input, ElementRef, HostListener, ViewChild } from '@angular/core';
import { ButtonComponent } from "../components/core/button/button.component";
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  label: string;
  callback: () => void;
}

@Component({
  selector: 'app-export-dropdown',
  templateUrl: './export-dropdown.component.html',
  styleUrls: ['./export-dropdown.component.scss'],
  standalone: true,
  imports: [ButtonComponent, CommonModule],
})
export class ExportDropdownComponent {
  @Input() disabled: boolean = false;
  @Input() options: DropdownOption[] = [];
  @Input() buttonLabel: string = 'Export';  

  isOpen = false;

  @ViewChild('dropdownContainer', { static: true }) dropdownContainer!: ElementRef;

  toggleDropdown(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen = !this.isOpen;
  }

  onOptionClick(option: DropdownOption, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    option.callback();
    this.closeDropdown();
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isOpen && this.dropdownContainer && !this.dropdownContainer.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }
}
