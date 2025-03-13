import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AnalyticsTracker } from 'src/app/services/analytics/analytics.interface';
import { setAnalyticsToggleState } from 'src/app/services/analytics/utils/analytics.utils';

@Component({
  selector: 'app-analytics-modal',
  templateUrl: './analytics-modal.component.html',
  styleUrls: ['./analytics-modal.component.scss'],
})
export class AnalyticsModalComponent {
  constructor(
    private dialogRef: MatDialogRef<AnalyticsModalComponent>,
    private analyticsTracker: AnalyticsTracker,
  ) {}

  allowAnalytics(): void {
    setAnalyticsToggleState(true);
    this.analyticsTracker.initAnalytics();
    this.dialogRef.close();
  }

  denyAnalytics(): void {
    setAnalyticsToggleState(false);
    this.dialogRef.close();
  }
}
