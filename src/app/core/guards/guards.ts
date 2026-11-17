import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Permission } from '../constants/permissions';
import { Role } from '../interfaces/models';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/dashboard']) : true;
};

/** Data-driven: route `data: { roles: ['admin'] }` and/or `data: { permission: 'claims.review' }`. */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const roles = route.data['roles'] as Role[] | undefined;
  const permission = route.data['permission'] as Permission | undefined;
  const role = auth.role();
  const ok = !!role && (!roles || roles.includes(role)) && (!permission || auth.can(permission));
  return ok ? true : inject(Router).createUrlTree(['/forbidden']);
};
