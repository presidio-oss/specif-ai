import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetUsernameComponent } from './get-username.component';

describe('GetUsernameComponent', () => {
  let component: GetUsernameComponent;
  let fixture: ComponentFixture<GetUsernameComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GetUsernameComponent]
    });
    fixture = TestBed.createComponent(GetUsernameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
