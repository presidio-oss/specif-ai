import { ComponentFixture, TestBed } from '@angular/core/testing';

import { McpServersModalComponent } from './mcp-servers-modal.component';

describe('McpServersDialogComponent', () => {
  let component: McpServersModalComponent;
  let fixture: ComponentFixture<McpServersModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [McpServersModalComponent]
    });
    fixture = TestBed.createComponent(McpServersModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
