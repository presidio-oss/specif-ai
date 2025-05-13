import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../components/layout/header/header.component';
import { ToasterComponent } from '../../components/toaster/toaster.component';
import { AlertComponent } from '../../components/core/alert/alert.component';
import { LoadingComponent } from '../../components/core/loading/loading.component';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    ToasterComponent,
    AlertComponent,
    LoadingComponent,
  ],
})
export class MainLayoutComponent {}
