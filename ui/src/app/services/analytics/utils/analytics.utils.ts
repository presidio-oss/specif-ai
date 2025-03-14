import { BehaviorSubject } from 'rxjs';

export const ANALYTICS_TOGGLE_KEY = 'analyticsEnabled';
export const analyticsEnabledSubject = new BehaviorSubject<boolean>(getAnalyticsToggleState());

export function getAnalyticsToggleState(): boolean {
  const storedValue = localStorage.getItem(ANALYTICS_TOGGLE_KEY);
  return storedValue === 'true';
}

export function setAnalyticsToggleState(enabled: boolean): void {
  localStorage.setItem(ANALYTICS_TOGGLE_KEY, JSON.stringify(enabled));
  analyticsEnabledSubject.next(enabled); 
}