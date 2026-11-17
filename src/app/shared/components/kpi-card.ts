import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** KPI tile with an optional 8-week sparkline; the whole tile links to the filtered list. */
@Component({
  selector: 'app-kpi-card',
  imports: [RouterLink],
  template: `
    <a [routerLink]="link()" [queryParams]="query()" class="cf-card block p-4 no-underline h-full transition-colors hover:border-[var(--p-primary-300)] focus-visible:outline-2" [attr.aria-label]="label() + ': ' + value()">
      <div class="flex items-start justify-between gap-3">
        <span class="text-[0.8125rem] font-semibold cf-muted leading-tight">{{ label() }}</span>
        <span class="w-8 h-8 rounded-lg grid place-items-center shrink-0" [style.background]="tint()" [style.color]="color()"><i [class]="icon()" class="text-sm"></i></span>
      </div>
      <div class="mt-2 flex items-end justify-between gap-2">
        <span class="text-3xl font-extrabold tabular-nums leading-none">{{ value() }}{{ suffix() }}</span>
        @if (points(); as p) {
          <svg width="84" height="28" viewBox="0 0 84 28" aria-hidden="true" class="shrink-0">
            <path [attr.d]="p.area" [attr.fill]="tint()" />
            <path [attr.d]="p.line" fill="none" [attr.stroke]="color()" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        }
      </div>
      @if (hint()) { <p class="m-0 mt-2 text-xs cf-muted">{{ hint() }}</p> }
    </a>
  `,
})
export class KpiCard {
  label = input.required<string>();
  value = input.required<number>();
  icon = input('pi pi-chart-bar');
  color = input('var(--cf-found)');
  hint = input<string>();
  suffix = input('');
  trend = input<number[] | undefined>();
  link = input<string>('/items');
  query = input<Record<string, string>>({});
  tint = computed(() => `color-mix(in srgb, ${this.color()} 14%, transparent)`);
  points = computed(() => {
    const t = this.trend();
    if (!t || t.length < 2) return null;
    const max = Math.max(1, ...t);
    const step = 84 / (t.length - 1);
    const pts = t.map((v, i) => [i * step, 26 - (v / max) * 22] as const);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return { line, area: `${line} L84,28 L0,28 Z` };
  });
}
