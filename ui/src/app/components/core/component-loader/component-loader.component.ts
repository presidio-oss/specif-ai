import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-component-loader',
  templateUrl: './component-loader.component.html',
  styleUrls: ['./component-loader.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ComponentLoaderComponent {
  @Input() isLoading: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() color: string = 'primary-600';
  @Input() center: boolean = true;
  @Input() padding: string = 'py-4';
}
