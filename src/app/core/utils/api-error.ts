import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the CampusFind server. Check your connection and try again.';
    return err.error?.error?.message ?? fallback;
  }
  return fallback;
}
export function errorCode(err: unknown): string | undefined {
  return err instanceof HttpErrorResponse ? err.error?.error?.code : undefined;
}

/** Map server-side field errors ({field, message}) onto reactive form controls. */
export function applyServerErrors(form: FormGroup, err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) return false;
  const details = err.error?.error?.details;
  if (!Array.isArray(details)) return false;
  let applied = false;
  for (const d of details) {
    const path = String(d.field ?? '').split('.')[0];
    const ctrl: AbstractControl | null = form.get(path);
    if (ctrl) {
      ctrl.setErrors({ ...(ctrl.errors ?? {}), server: d.message });
      ctrl.markAsTouched();
      applied = true;
    }
  }
  return applied;
}
