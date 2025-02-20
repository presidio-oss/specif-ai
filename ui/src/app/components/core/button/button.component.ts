import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  standalone: true,
  imports: [NgClass, NgIconComponent, NgIf],
})
export class ButtonComponent {
  @Input() buttonContent: string = '';
  @Input() theme:
    | 'primary'
    | 'primary_outline'
    | 'secondary'
    | 'secondary_outline'
    | 'danger'
    | 'green' = 'primary';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  @Input() rounded: 'none' | 'sm' | 'md' | 'lg' = 'md';
  @Input() roundedLeft: 'none' | 'sm' | 'md' | 'lg' = 'none';
  @Input() roundedRight: 'none' | 'sm' | 'md' | 'lg' = 'none';
  @Input() disabled: boolean = false;
  @Input() icon?: string;
  @Input() type: string = 'button';
  @Input() isIconButton: boolean = false;
  @Input() isFullWidth: boolean = false;

  get themeClasses() {
    const styles = {
      primary: {
        bg: 'bg-primary-600',
        text: 'text-white',
        hoverBg: 'hover:bg-primary-700',
        disabledBg: 'bg-primary-500',
        disabledText: 'text-primary-200',
        border: '',
      },
      primary_outline: {
        bg: 'bg-transparent',
        text: 'text-primary-600',
        hoverBg: 'hover:bg-primary-200',
        disabledBg: 'bg-transparent',
        disabledText: 'text-primary-300',
        border: 'border border-primary-300',
      },
      secondary: {
        bg: 'bg-primary-50',
        text: 'text-primary-600',
        hoverBg: 'hover:bg-secondary-200',
        disabledBg: 'bg-secondary-50',
        disabledText: 'text-secondary-300',
        border: 'border border-primary-300',
      },
      secondary_outline: {
        bg: 'bg-transparent',
        text: 'text-secondary-900',
        hoverBg: 'hover:bg-secondary-200',
        disabledBg: 'bg-transparent',
        disabledText: 'text-secondary-300',
        border: 'border border-secondary-200',
      },
      danger: {
        bg: 'bg-red-600',
        text: 'text-secondary-50',
        hoverBg: 'hover:bg-red-700',
        disabledBg: 'bg-red-600',
        disabledText: 'text-secondary-50',
        border: '',
      },
      green: {
        bg: 'bg-green-500',
        text: 'text-white',
        hoverBg: 'hover:bg-green-600',
        disabledBg: 'bg-green-400',
        disabledText: 'text-green-300',
        border: '',
      },
    };
    return styles[this.theme] || styles.primary;
  }

  get sizeClass(): string {
    switch (this.size) {
      case 'xs':
        return 'px-2 py-1 text-xs';
      case 'sm':
        return 'px-3 py-2 text-xs';
      case 'md':
        return 'text-sm px-5 py-2.5';
      case 'lg':
        return 'text-base px-5 py-3';
      default:
        return 'text-sm px-5 py-2.5';
    }
  }

  get roundedClass(): string {
    const leftClass =
      this.roundedLeft !== 'none' ? `rounded-l-${this.roundedLeft}` : '';
    const rightClass =
      this.roundedRight !== 'none' ? `rounded-r-${this.roundedRight}` : '';
    const baseClass = this.rounded !== 'none' ? `rounded-${this.rounded}` : '';
    return `${baseClass} ${leftClass} ${rightClass}`.trim();
  }
}
