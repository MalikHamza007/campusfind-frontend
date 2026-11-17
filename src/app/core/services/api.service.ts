import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { cleanParams } from '../utils/format';

/** Requests flagged SILENT skip the global error toast (the page shows its own state). */
export const SILENT = new HttpContextToken<boolean>(() => false);
export const silent = () => new HttpContext().set(SILENT, true);

const TIMEOUT_MS = 20000;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly base = environment.apiUrl;
  /** API origin without the /api suffix — signed file paths are relative to it. */
  readonly origin = environment.apiUrl.replace(/\/api\/?$/, '');

  get<T>(path: string, params: Record<string, unknown> = {}, quiet = false): Observable<T> {
    return this.http.get<T>(this.base + path, { params: cleanParams(params), context: quiet ? silent() : undefined }).pipe(timeout(TIMEOUT_MS));
  }
  post<T>(path: string, body: unknown = {}, quiet = false): Observable<T> {
    return this.http.post<T>(this.base + path, body, { context: quiet ? silent() : undefined }).pipe(timeout(TIMEOUT_MS));
  }
  patch<T>(path: string, body: unknown, quiet = false): Observable<T> {
    return this.http.patch<T>(this.base + path, body, { context: quiet ? silent() : undefined }).pipe(timeout(TIMEOUT_MS));
  }
  delete<T>(path: string, quiet = false): Observable<T> {
    return this.http.delete<T>(this.base + path, { context: quiet ? silent() : undefined }).pipe(timeout(TIMEOUT_MS));
  }
  /** Fetch a private-bucket object through its 60-second signed path. */
  blob(signedPath: string): Observable<Blob> {
    return this.http.get(this.origin + signedPath, { responseType: 'blob', context: silent() }).pipe(timeout(TIMEOUT_MS));
  }
}
