import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeBounceLoaderComponent } from './three-bounce-loader.component';

describe('ThreeBounceLoaderComponent', () => {
  let component: ThreeBounceLoaderComponent;
  let fixture: ComponentFixture<ThreeBounceLoaderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ThreeBounceLoaderComponent]
    });
    fixture = TestBed.createComponent(ThreeBounceLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
