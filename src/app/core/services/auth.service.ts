import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, firstValueFrom, map, Observable, of, shareReplay, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../interfaces/models';
import { can, isStaffRole, Permission, ROLE_ICON, ROLE_LABEL } from '../constants/permissions';

interface AuthResponse { accessToken: string; user: User }

/**
 * Access token lives only in memory (signal). The refresh token is an HttpOnly cookie Angular never reads.
 * On load we call /auth/refresh once to restore the session.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = environment.apiUrl + '/auth';

  private readonly _user = signal<User | null>(null);
  private accessToken: string | null = null;
  private refreshing$: Observable<string | null> | null = null;

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly role = computed(() => this._user()?.role);
  /** Staff or super admin — anyone who works the lost & found queue. */
  readonly isAdmin = computed(() => isStaffRole(this._user()?.role));
  readonly isSuperAdmin = computed(() => this._user()?.role === 'super_admin');
  readonly roleLabel = computed(() => { const r = this._user()?.role; return r ? ROLE_LABEL[r] : ''; });
  readonly roleIcon = computed(() => { const r = this._user()?.role; return r ? ROLE_ICON[r] : 'pi pi-user'; });

  token(): string | null {
    return this.accessToken;
  }
  can(p: Permission): boolean {
    return can(this.role(), p);
  }

  /** Called once by the app initializer; never throws, never hangs (8s cap). */
  async restore(): Promise<void> {
    await firstValueFrom(this.refresh().pipe(timeout(8000), catchError(() => of(null))));
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password }, { withCredentials: true }).pipe(tap((r) => this.setSession(r)));
  }

  register(body: Record<string, unknown>) {
    return this.http.post<{ user: User }>(`${this.base}/register`, body, { withCredentials: true });
  }

  /** Single in-flight refresh shared by every 401 that happens at the same time. */
  refresh(): Observable<string | null> {
    if (!this.refreshing$) {
      this.refreshing$ = this.http.post<AuthResponse>(`${this.base}/refresh`, {}, { withCredentials: true }).pipe(
        tap((r) => this.setSession(r)),
        map((r) => r.accessToken),
        catchError(() => {
          this.clear();
          return of(null);
        }),
        finalize(() => (this.refreshing$ = null)),
        shareReplay(1),
      );
    }
    return this.refreshing$;
  }

  logout(redirect = true) {
    const done = () => {
      this.clear();
      if (redirect) void this.router.navigate(['/login']);
    };
    this.http.post(`${this.base}/logout`, {}, { withCredentials: true }).pipe(timeout(5000), catchError(() => of(null))).subscribe(done);
  }

  updateUser(u: User) {
    this._user.set(u);
  }

  /** Session expired mid-use: clear and send to login, keeping where they were. */
  expire() {
    const here = this.router.url;
    this.clear();
    void this.router.navigate(['/login'], { queryParams: { returnUrl: here, expired: 1 } });
  }

  private setSession(r: AuthResponse) {
    this.accessToken = r.accessToken;
    this._user.set(r.user);
  }
  private clear() {
    this.accessToken = null;
    this._user.set(null);
  }
}
