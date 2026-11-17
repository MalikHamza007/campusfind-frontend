import { Injectable, signal } from '@angular/core';

const KEY = 'cf-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(false);

  init() {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* storage blocked */ }
    const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(saved ? saved === 'dark' : prefersDark);
  }
  toggle() {
    this.apply(!this.dark());
    try { localStorage.setItem(KEY, this.dark() ? 'dark' : 'light'); } catch { /* ignore */ }
  }
  private apply(dark: boolean) {
    this.dark.set(dark);
    document.documentElement.classList.toggle('app-dark', dark);
  }
}
