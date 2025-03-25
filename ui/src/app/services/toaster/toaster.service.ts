import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { DEFAULT_TOAST_DURATION } from 'src/app/constants/toast.constant';

@Injectable({
  providedIn: 'root',
})
export class ToasterService {
  private toastSubject = new Subject<any>();
  private id = 0;
  private isLLMConfigToastActive = false;

  constructor() {}

  getToasts(): Observable<any> {
    return this.toastSubject.asObservable();
  }

  showToast(type: string, message: string, duration: number = DEFAULT_TOAST_DURATION, isLLMConfigToast: boolean = false) {
    if (this.isLLMConfigToastActive && !isLLMConfigToast) {
      return;
    }

    const toastId = this.id;

    if (isLLMConfigToast) {
      this.isLLMConfigToastActive = true;
      setTimeout(() => {
        this.isLLMConfigToastActive = false;
      }, duration);
    }

    this.toastSubject.next({ id: toastId, type, message, duration });
  }

  showSuccess(message: string, duration: number = DEFAULT_TOAST_DURATION, isLLMConfigToast: boolean = false) {
    this.showToast('success', message, duration, isLLMConfigToast);
  }

  showError(message: string, duration: number = DEFAULT_TOAST_DURATION, isLLMConfigToast: boolean = false) {
    this.showToast('error', message, duration, isLLMConfigToast);
  }

  showInfo(message: string, duration: number = DEFAULT_TOAST_DURATION, isLLMConfigToast: boolean = false) {
    this.showToast('info', message, duration, isLLMConfigToast);
  }
  
  showWarning(message: string, duration: number = DEFAULT_TOAST_DURATION, isLLMConfigToast: boolean = false) {
    this.showToast('warning', message, duration, isLLMConfigToast);
  }
}
