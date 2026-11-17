import { cleanParams, formatBytes, initials, safeReturnUrl, timeAgo } from './format';

describe('format utils', () => {
  it('blocks open redirects in returnUrl', () => {
    expect(safeReturnUrl('/items?q=calc')).toBe('/items?q=calc');
    expect(safeReturnUrl('//evil.example')).toBe('/dashboard');
    expect(safeReturnUrl('https://evil.example')).toBe('/dashboard');
    expect(safeReturnUrl('/\\evil')).toBe('/dashboard');
    expect(safeReturnUrl('/login')).toBe('/dashboard');
    expect(safeReturnUrl(undefined)).toBe('/dashboard');
  });
  it('formats sizes and initials', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(initials('Ali Raza')).toBe('AR');
  });
  it('describes relative time', () => {
    const now = Date.parse('2026-11-17T12:00:00Z');
    expect(timeAgo('2026-11-17T11:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-11-17T11:00:00Z', now)).toBe('1 h ago');
    expect(timeAgo('2026-11-14T12:00:00Z', now)).toBe('3 d ago');
  });
  it('drops empty query params and formats dates', () => {
    expect(cleanParams({ q: '', type: 'lost', page: 1, x: null, d: new Date(2026, 10, 5) })).toEqual({ type: 'lost', page: '1', d: '2026-11-05' });
  });
});
