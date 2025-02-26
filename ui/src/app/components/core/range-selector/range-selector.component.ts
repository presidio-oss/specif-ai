import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-range-selector',
  templateUrl: './range-selector.component.html',
  standalone: true,
  imports: [CommonModule, MatSliderModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RangeSelectorComponent),
      multi: true,
    },
  ],
})
export class RangeSelectorComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() min: number = 0;
  @Input() max: number = 30;
  @Input() step: number = 5;

  value: [number, number] = [0, 0];
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: [number, number]): void {
    if (value) {
      this.value = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onMinChange(value: number): void {
    if (value <= this.value[1]) {
      this.value = [value, this.value[1]];
      this.onChange(this.value);
      this.onTouched();
    }
  }

  onMaxChange(value: number): void {
    if (value >= this.value[0]) {
      this.value = [this.value[0], value];
      this.onChange(this.value);
      this.onTouched();
    }
  }
}
