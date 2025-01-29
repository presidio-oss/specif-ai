import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { DEFAULT_TOAST_DURATION } from 'src/app/constants/toast.constant';

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

  showToast(type: string, message: string, duration: number = DEFAULT_TOAST_DURATION) {
    this.id++;  // Increment the ID to ensure it's unique for every toast
    const toastId = this.id;
    this.toastSubject.next({ id: toastId, type, message, duration });
  }

  showSuccess(message: string, duration: number = DEFAULT_TOAST_DURATION) {
    this.showToast('success', message, duration);
  }

  showError(message: string, duration: number = DEFAULT_TOAST_DURATION) {
    this.showToast('error', message, duration);
  }

  showInfo(message: string, duration: number = DEFAULT_TOAST_DURATION) {
    this.showToast('info', message, duration);
  }
  
  showWarning(message: string, duration: number = DEFAULT_TOAST_DURATION) {
    this.showToast('warning', message, duration);
  }
}
