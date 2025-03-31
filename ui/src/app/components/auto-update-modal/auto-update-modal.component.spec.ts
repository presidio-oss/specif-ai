import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoUpdateModalComponent } from './auto-update-modal.component';

describe('AnalyticsModalComponent', () => {
  let component: AutoUpdateModalComponent;
  let fixture: ComponentFixture<AutoUpdateModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AutoUpdateModalComponent]
    });
    fixture = TestBed.createComponent(AutoUpdateModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
