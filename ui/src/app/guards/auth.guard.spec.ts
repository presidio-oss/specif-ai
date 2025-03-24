import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { UserGuard } from './auth.guard';

describe('UserGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
      TestBed.runInInjectionContext(() => UserGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
