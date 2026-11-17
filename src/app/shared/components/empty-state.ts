import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="flex flex-col items-center text-center gap-3 py-12 px-6">
      <svg width="96" height="72" viewBox="0 0 96 72" aria-hidden="true">
        <rect x="10" y="22" width="60" height="40" rx="8" fill="var(--cf-surface-2)" stroke="var(--cf-border)" stroke-width="2" />
        <path d="M40 6h34l12 12v26a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill="var(--cf-tag)" transform="rotate(8 60 28)" />
        <circle cx="46" cy="18" r="4" fill="var(--cf-surface)" transform="rotate(8 60 28)" />
        <path d="M44 32h26M44 39h16" stroke="var(--cf-tag-ink)" stroke-width="3" stroke-linecap="round" opacity=".55" transform="rotate(8 60 28)" />
      </svg>
      <h3 class="m-0 text-base font-bold">{{ title() }}</h3>
      @if (message()) { <p class="m-0 cf-muted text-sm max-w-sm">{{ message() }}</p> }
      <div class="mt-1 flex gap-2 flex-wrap justify-center"><ng-content /></div>
    </div>
  `,
})
export class EmptyState {
  title = input.required<string>();
  message = input<string>();
}

@Component({
  selector: 'app-error-state',
  template: `
    <div class="flex flex-col items-center text-center gap-3 py-10 px-6" role="alert">
      <span class="w-12 h-12 rounded-full grid place-items-center" style="background: color-mix(in srgb, var(--p-red-500) 12%, transparent)"><i class="pi pi-exclamation-triangle" style="color: var(--p-red-500)"></i></span>
      <h3 class="m-0 text-base font-bold">{{ title() }}</h3>
      <p class="m-0 cf-muted text-sm max-w-sm">{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class ErrorState {
  title = input('Could not load this');
  message = input('Check your connection and try again.');
}
