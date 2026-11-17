export function formatBytes(n: number): string {
  if (n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function timeAgo(iso: string | Date, now = Date.now()): string {
  const t = new Date(iso).getTime();
  const s = Math.round((now - t) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initials(name?: string | null): string {
  return (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}

/** Only allow internal, single-slash paths as post-login redirects (blocks open redirects). */
export function safeReturnUrl(url: string | null | undefined, fallback = '/dashboard'): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\') || url.startsWith('/login') || url.startsWith('/register')) return fallback;
  return url;
}

export function toIsoDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Strip empty values from a filter object before sending it as query params. */
export function cleanParams(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v instanceof Date ? toIsoDate(v)! : String(v);
  }
  return out;
}
