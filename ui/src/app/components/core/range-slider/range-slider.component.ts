import { Component, Input, forwardRef } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-range-slider',
  standalone: true,
  imports: [CommonModule, MatSliderModule, ReactiveFormsModule],
  templateUrl: './range-slider.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RangeSliderComponent),
      multi: true,
    },
  ],
})
export class RangeSliderComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() min: number = 5;
  @Input() max: number = 30;
  @Input() step: number = 5;
  value: { min_count: number; max_count: number } = {
    min_count: 1,
    max_count: 30,
  };
  disabled = false;

  onChange = (_: any) => {};
  onTouch = () => {};

  onMinChange(value: number) {
    this.value = { ...this.value, min_count: value };
    this.onChange(this.value);
    this.onTouch();
  }

  onMaxChange(value: number) {
    this.value = { ...this.value, max_count: value };
    this.onChange(this.value);
    this.onTouch();
  }

  writeValue(value: { min_count: number; max_count: number }): void {
    if (value) {
      this.value = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
