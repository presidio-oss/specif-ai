import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-three-bounce-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './three-bounce-loader.component.html',
  styleUrls: ['./three-bounce-loader.component.scss']
})
export class ThreeBounceLoaderComponent {
  @Input() loadingSRMessage = 'Loading...';
}
