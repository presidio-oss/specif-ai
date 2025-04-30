import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredefinedMcpServerComponent } from './predefined-mcp-server.component';

describe('PredefinedMcpServerComponent', () => {
  let component: PredefinedMcpServerComponent;
  let fixture: ComponentFixture<PredefinedMcpServerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PredefinedMcpServerComponent]
    });
    fixture = TestBed.createComponent(PredefinedMcpServerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
