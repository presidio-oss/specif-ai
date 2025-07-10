import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestCasesComponent } from './test-case-list.component';

describe('TestCasesComponent', () => {
  let component: TestCasesComponent;
  let fixture: ComponentFixture<TestCasesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestCasesComponent],
    });
    fixture = TestBed.createComponent(TestCasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
