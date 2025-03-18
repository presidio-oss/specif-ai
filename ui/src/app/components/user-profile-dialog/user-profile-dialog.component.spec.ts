import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserProfileDialogComponent } from './user-profile-dialog.component';

describe('UserProfileDialogComponent', () => {
  let component: UserProfileDialogComponent;
  let fixture: ComponentFixture<UserProfileDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UserProfileDialogComponent]
    });
    fixture = TestBed.createComponent(UserProfileDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
