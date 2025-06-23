import { Component, Input, ElementRef, HostListener, ViewChild } from '@angular/core';
import { ButtonComponent } from "../components/core/button/button.component";
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroPaperClip,
  heroDocumentText,
  heroArrowUpTray,
  heroArrowDownTray,
  heroEllipsisVertical,
  heroChevronDown,
  heroChevronRight
} from '@ng-icons/heroicons/outline';
import { TimeZonePipe } from '../pipes/timezone-pipe';

export interface DropdownOption {
  label: string;
  callback: () => void;
  additionalInfo?: string;
  isTimestamp?: boolean;
  icon?: string;
}

export interface DropdownOptionGroup {
  groupName: string;
  options: DropdownOption[];
}

@Component({
  selector: 'app-export-dropdown',
  templateUrl: './export-dropdown.component.html',
  styleUrls: ['./export-dropdown.component.scss'],
  standalone: true,
  imports: [ButtonComponent, CommonModule, NgIconComponent, TimeZonePipe],
  providers: [
    provideIcons({
      heroPaperClip,
      heroDocumentText,
      heroArrowUpTray,
      heroArrowDownTray,
      heroEllipsisVertical,
      heroChevronDown,
      heroChevronRight
    })
  ]
})
export class ExportDropdownComponent {
  @Input() disabled: boolean = false;
  @Input() options: DropdownOption[] = [];
  @Input() groupedOptions: DropdownOptionGroup[] = [];
  @Input() buttonLabel: string = 'Options';  

  isOpen = false;

  @ViewChild('dropdownContainer', { static: false }) dropdownContainer!: ElementRef;

  toggleDropdown(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen = !this.isOpen;
  }

  onOptionClick(option: DropdownOption, event: MouseEvent): void {
    if (option && typeof option.callback === 'function') {
      try {
        option.callback();
      } catch (error) {
        console.error('Error executing callback:', error);
      }
    }
    
    // Then handle the event and close dropdown
    event.preventDefault();
    event.stopPropagation();
    this.closeDropdown();
  }

  closeDropdown(): void {
    this.isOpen = false;
  }

  hasAnyOptions(): boolean {
  return this.groupedOptions?.some(group => group.options && group.options.length > 0) || false;
}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInside = this.dropdownContainer?.nativeElement.contains(target);
    const isMenuItemClick = target.closest('[role="menuitem"]');

    if (!clickedInside && !isMenuItemClick) {
      this.closeDropdown();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(event: KeyboardEvent) {
    this.closeDropdown();
  }
}
