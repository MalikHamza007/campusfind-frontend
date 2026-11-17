import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  const auth = { token: vi.fn(() => 'old-token'), refresh: vi.fn(() => of('new-token')), expire: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), { provide: AuthService, useValue: auth }],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  it('attaches the bearer token to API calls only', () => {
    http.get(`${environment.apiUrl}/items`).subscribe();
    http.get('https://tile.openstreetmap.org/1/1/1.png').subscribe();
    expect(ctrl.expectOne(`${environment.apiUrl}/items`).request.headers.get('Authorization')).toBe('Bearer old-token');
    expect(ctrl.expectOne('https://tile.openstreetmap.org/1/1/1.png').request.headers.has('Authorization')).toBe(false);
  });

  it('refreshes once on 401 and retries with the new token', () => {
    let body: unknown;
    http.get(`${environment.apiUrl}/claims`).subscribe((b) => (body = b));
    ctrl.expectOne(`${environment.apiUrl}/claims`).flush({ error: { code: 'TOKEN_INVALID' } }, { status: 401, statusText: 'Unauthorized' });
    const retry = ctrl.expectOne(`${environment.apiUrl}/claims`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    retry.flush({ data: [] });
    expect(body).toEqual({ data: [] });
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it('ends the session when refresh fails', () => {
    auth.refresh.mockReturnValueOnce(of(null as unknown as string));
    http.get(`${environment.apiUrl}/claims`).subscribe({ error: () => undefined });
    ctrl.expectOne(`${environment.apiUrl}/claims`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.expire).toHaveBeenCalled();
  });
});
