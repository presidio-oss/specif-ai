import { Component, Input, Output, EventEmitter, forwardRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  templateUrl: './app-select.component.html',
  standalone: true,
  imports: [NgForOf, NgIf, NgIconComponent],
  providers: [
    provideIcons({ heroXMark }),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSelectComponent),
      multi: true
    }
  ]
})
export class AppSelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder: string = 'Select an option';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() searchable: boolean = false;
  @Input() label: string = '';
  @Input() showRequiredIndicator: boolean = false;
  @Input() customClass: string = '';
  @Input() dropdownClass: string = '';
  @Input() optionClass: string = '';
  @Input() clearable: boolean = false;

  @Output() selectionChange = new EventEmitter<string | null>();

  showDropdown: boolean = false;
  filteredOptions: SelectOption[] = [];
  selectedOption: SelectOption | null = null;
  searchText: string = '';
  touched: boolean = false;

  private onChange: any = () => {};
  private onTouched: any = () => {};

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-container')) {
      this.showDropdown = false;
    }
  }

  constructor() {
    this.filteredOptions = this.options;
  }

  writeValue(value: any): void {
    if (value) {
      this.selectedOption = this.options.find(opt => opt.value === value) || null;
      this.searchText = this.selectedOption?.label || '';
    } else {
      this.selectedOption = null;
      this.searchText = '';
    }
    this.filterOptions();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (!this.disabled) {
      this.showDropdown = !this.showDropdown;
      if (!this.touched) {
        this.touched = true;
        this.onTouched();
      }
      if (this.showDropdown) {
        this.filterOptions();
      }
    }
  }

  onInputChange(event: Event): void {
    const input = (event.target as HTMLInputElement).value;
    this.searchText = input;
    this.filterOptions();
    this.showDropdown = true;
    
    // Update form control with typed value
    this.onChange(input);
    
    if (!this.touched) {
      this.touched = true;
      this.onTouched();
    }
  }

  selectOption(option: SelectOption): void {
    this.selectedOption = option;
    this.searchText = option.label;
    this.showDropdown = false;
    this.onChange(option.value);
    this.selectionChange.emit(option.value);
  }

  clear(event: Event): void {
    event.stopPropagation();
    this.selectedOption = null;
    this.searchText = '';
    this.onChange(null);
    this.selectionChange.emit(null);
  }

  private filterOptions(): void {
    if (!this.searchable) {
      this.filteredOptions = this.options;
      return;
    }

    const search = this.searchText.toLowerCase();
    this.filteredOptions = this.options.filter(option =>
      option.label.toLowerCase().includes(search) || 
      option.value.toLowerCase().includes(search)
    );
  }
}
