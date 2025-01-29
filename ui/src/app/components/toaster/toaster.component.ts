import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ToasterService } from '../../services/toaster/toaster.service';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { heroCheckCircle, heroExclamationCircle, heroInformationCircle, heroExclamationTriangle } from '@ng-icons/heroicons/outline';
import { Subscription } from 'rxjs';
import { DEFAULT_TOAST_DURATION } from 'src/app/constants/toast.constant';

@Component({
  selector: 'app-toaster',
  templateUrl: './toaster.component.html',
  styleUrls: ['./toaster.component.scss'],
  standalone: true,
  imports: [NgForOf, NgClass, NgIf, NgIconComponent],
  providers: [
    { provide: 'icons', useValue: { heroCheckCircle, heroExclamationCircle, heroInformationCircle, heroExclamationTriangle } }
  ]
})
export class ToasterComponent implements OnInit, OnDestroy {
  toasts: any[] = [];
  private toastSubscription: Subscription = new Subscription();
  private toastTimeouts: { [id: number]: any } = {};

  constructor(
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.toastSubscription = this.toasterService.getToasts().subscribe((newToast) => {
      this.addToast(newToast);
    });
  }

  addToast(newToast: any) {
    if (!newToast.message || newToast.message.trim() === '') {
      return;
    }
    const toast = { ...newToast, show: true };
    this.toasts.push(toast);
    this.cdr.detectChanges();

    // Set timeout for auto-removal
    this.toastTimeouts[toast.id] = setTimeout(() => {
      this.removeToast(toast.id);
    }, newToast.duration);
  }

  removeToast(id: number) {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index > -1) {
      // Clear the timeout
      if (this.toastTimeouts[id]) {
        clearTimeout(this.toastTimeouts[id]);
        delete this.toastTimeouts[id];
      }

      // Start fade-out animation
      this.toasts[index].show = false;
      this.cdr.detectChanges();

      // Remove toast after animation completes
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.cdr.detectChanges();
      }, 300);
    }
  }

  // Add this method to handle manual toast dismissal
  onToastClick(id: number) {
    this.removeToast(id);
  }

  ngOnDestroy() {
    if (this.toastSubscription) {
      this.toastSubscription.unsubscribe();
    }
    // Clear all timeouts
    Object.values(this.toastTimeouts).forEach(clearTimeout);
  }
}
