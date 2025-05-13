import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewMcpServerComponent } from './new-mcp-server.component';

describe('NewMcpServerComponent', () => {
  let component: NewMcpServerComponent;
  let fixture: ComponentFixture<NewMcpServerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewMcpServerComponent]
    });
    fixture = TestBed.createComponent(NewMcpServerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
