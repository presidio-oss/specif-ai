import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ToasterService } from '../../services/toaster/toaster.service';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { heroCheckCircle, heroExclamationCircle, heroInformationCircle, heroExclamationTriangle } from '@ng-icons/heroicons/outline';
import { Subscription } from 'rxjs';

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
    this.toastSubscription = this.toasterService.getToasts().subscribe((toast) => {
      this.addToast(toast);
    });
  }

  addToast(toast: any) {
    if (!toast.message || toast.message.trim() === '') {
      return;
    }
    const newToast = { ...toast, show: true };
    this.toasts = [newToast];
    this.cdr.detectChanges();

    // Set timeout for auto-removal
    this.toastTimeouts[newToast.id] = setTimeout(() => {
      this.removeToast(newToast.id);
    }, newToast.duration || 5000);
  }

  removeToast(id: number) {
    const toastIndex = this.toasts.findIndex((t) => t.id === id);
    if (toastIndex > -1) {
      // Clear the timeout
      if (this.toastTimeouts[id]) {
        clearTimeout(this.toastTimeouts[id]);
        delete this.toastTimeouts[id];
      }

      // Start fade-out animation
      this.toasts[toastIndex].show = false;
      this.cdr.detectChanges();

      // Remove toast from array after animation completes
      setTimeout(() => {
        this.toasts = this.toasts.filter((toast) => toast.id !== id);
        if (this.toasts.length === 0) {
          // Ensure the toast container is removed from the DOM
          this.cdr.detectChanges();
        }
      }, 300); // Adjust this value to match your CSS transition duration
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
