import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, TimeoutError } from 'rxjs';
import { SILENT } from '../services/api.service';
import { NotifyService } from '../services/notify.service';

/** Global toasts for problems a page cannot fix itself: offline, rate limit, server error, forbidden. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotifyService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof TimeoutError) notify.error('The server is taking too long', 'Please try again in a moment.');
      else if (err instanceof HttpErrorResponse && !req.context.get(SILENT)) {
        const msg = err.error?.error?.message;
        if (err.status === 0) notify.error('Cannot reach CampusFind', 'Check your connection and try again.');
        else if (err.status === 429) notify.warn('Slow down a little', msg ?? 'Too many requests.');
        else if (err.status === 403) notify.error('Not allowed', msg);
        else if (err.status >= 500) notify.error('Server error', msg ?? 'Please try again.');
      }
      return throwError(() => err);
    }),
  );
};
