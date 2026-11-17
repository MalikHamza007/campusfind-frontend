import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal, computed } from '@angular/core';
import { authGuard, guestGuard, roleGuard } from './guards';
import { AuthService } from '../services/auth.service';
import { can } from '../constants/permissions';
import { Role } from '../interfaces/models';

function setup(role: Role | null) {
  const r = signal<Role | undefined>(role ?? undefined);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isLoggedIn: computed(() => !!r()), role: r, can: (p: never) => can(r(), p) } },
    ],
  });
}
const run = (guard: typeof authGuard, data: Record<string, unknown> = {}, url = '/admin/claims') =>
  TestBed.runInInjectionContext(() => guard({ data } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));

describe('route guards', () => {
  it('authGuard sends guests to /login with returnUrl', () => {
    setup(null);
    const res = run(authGuard) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(res)).toBe('/login?returnUrl=%2Fadmin%2Fclaims');
  });
  it('authGuard lets signed-in users through', () => {
    setup('student');
    expect(run(authGuard)).toBe(true);
  });
  it('guestGuard keeps signed-in users away from /login', () => {
    setup('student');
    expect(TestBed.inject(Router).serializeUrl(run(guestGuard) as UrlTree)).toBe('/dashboard');
  });
  it('roleGuard blocks students from admin routes', () => {
    setup('student');
    expect(TestBed.inject(Router).serializeUrl(run(roleGuard, { roles: ['admin'] }) as UrlTree)).toBe('/forbidden');
  });
  it('roleGuard allows admins and checks permissions', () => {
    setup('admin');
    expect(run(roleGuard, { roles: ['admin'] })).toBe(true);
    expect(run(roleGuard, { permission: 'claims.review' })).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(run(roleGuard, { permission: 'claims.create' }) as UrlTree)).toBe('/forbidden');
  });
  it('super admin inherits staff routes and alone holds role management', () => {
    setup('super_admin');
    expect(run(roleGuard, { roles: ['admin'] })).toBe(true);
    expect(run(roleGuard, { permission: 'users.roles' })).toBe(true);
    expect(can('admin', 'users.roles')).toBe(false);
    expect(can('admin', 'claims.review')).toBe(true);
    expect(can('student', 'claims.review')).toBe(false);
  });
});
