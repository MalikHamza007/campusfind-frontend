import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

const withToken = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/** Attaches the in-memory access token; on 401 refreshes once (shared) and retries; otherwise ends the session. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const auth = inject(AuthService);
  const isAuthCall = /\/auth\/(login|register|refresh|logout)$/.test(req.url);
  const isFileContent = /\/files\/[a-f0-9]{24}\/content/.test(req.url);
  if (isAuthCall || isFileContent) return next(req);

  return next(withToken(req, auth.token())).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return auth.refresh().pipe(
        switchMap((token) => {
          if (!token) {
            auth.expire();
            return throwError(() => err);
          }
          return next(withToken(req, token));
        }),
      );
    }),
  );
};
