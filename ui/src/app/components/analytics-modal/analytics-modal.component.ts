import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AnalyticsTracker } from 'src/app/services/analytics/analytics.interface';

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
    this.analyticsTracker.initAnalytics();
    this.dialogRef.close();
  }

  denyAnalytics(): void {
    this.dialogRef.close();
  }
}
