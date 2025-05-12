import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-input-field',
  templateUrl: './input-field.component.html',
  styleUrls: ['./input-field.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: InputFieldComponent,
      multi: true,
    },
  ],
  standalone: true,
  imports: [NgIf],
})
export class InputFieldComponent implements ControlValueAccessor {
  @Input() elementId!: string;
  @Input() elementName!: string;
  @Input() elementPlaceHolder!: string;
  @Input() required?: boolean = false;
  @Input() elementType: string = 'text';
  @Input() showLabel: boolean = true;
  @Input() customClass: string = '';

  @Output() enterPressed = new EventEmitter<void>();

  value: string = '';
  onValueChangeFn: any;
  onTouchFn: any;
  isDisabled: boolean = false;

  onChange(target: any) {
    this.onValueChangeFn(target.value);
    this.onTouchFn();
  }

  onKeyDown() {
    this.enterPressed.emit();
  }

  writeValue(obj: any): void {
    this.value = obj;
  }

  registerOnChange(fn: any): void {
    this.onValueChangeFn = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchFn = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
