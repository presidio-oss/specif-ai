import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportDropdownComponent } from './export-dropdown.component';

describe('ExportDropdownComponent', () => {
  let component: ExportDropdownComponent;
  let fixture: ComponentFixture<ExportDropdownComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExportDropdownComponent]
    });
    fixture = TestBed.createComponent(ExportDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
