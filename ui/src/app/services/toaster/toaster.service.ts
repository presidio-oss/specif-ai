import { Injectable } from '@angular/core';
import { Subject, Observable, timer } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ToasterService {
  private toastSubject = new Subject<any>();
  private id = 0;

  constructor() {}

  getToasts(): Observable<any> {
    return this.toastSubject.asObservable();
  }

  showToast(type: string, message: string, duration: number = 5000) {
    this.id++;  // Increment the ID to ensure it's unique for every toast
    const toastId = this.id;
    this.toastSubject.next({ id: toastId, type, message });

    // Auto-dismiss the toast after the specified duration
    timer(duration).pipe(
      takeUntil(this.toastSubject.pipe(
        // Stop the timer if a new toast with the same ID is shown
        // (which shouldn't happen, but just in case)
        filter(toast => toast.id === toastId)
      ))
    ).subscribe(() => {
      this.dismissToast(toastId);
    });
  }

  showSuccess(message: string, duration: number = 5000) {
    this.showToast('success', message, duration);
  }

  showError(message: string, duration: number = 5000) {
    this.showToast('error', message, duration);
  }

  showInfo(message: string, duration: number = 5000) {
    this.showToast('info', message, duration);
  }
  
  showWarning(message: string, duration: number = 5000) {
    this.showToast('warning', message, duration);
  }

  private dismissToast(id: number) {
    this.toastSubject.next({ id, type: 'dismiss' });
  }
}
