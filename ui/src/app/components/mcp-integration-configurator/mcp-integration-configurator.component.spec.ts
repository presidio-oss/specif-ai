import { ComponentFixture, TestBed } from '@angular/core/testing';

import { McpIntegrationConfiguratorComponent } from './mcp-integration-configurator.component';

describe('McpIntegrationConfiguratorComponent', () => {
  let component: McpIntegrationConfiguratorComponent;
  let fixture: ComponentFixture<McpIntegrationConfiguratorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [McpIntegrationConfiguratorComponent]
    });
    fixture = TestBed.createComponent(McpIntegrationConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
