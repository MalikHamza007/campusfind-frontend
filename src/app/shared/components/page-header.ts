import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div class="min-w-0">
        <h1 class="text-2xl md:text-[1.75rem] font-extrabold m-0 leading-tight">{{ title() }}</h1>
        @if (subtitle()) { <p class="cf-muted mt-1.5 mb-0 text-sm max-w-2xl">{{ subtitle() }}</p> }
      </div>
      <div class="flex flex-wrap gap-2 shrink-0"><ng-content /></div>
    </header>
  `,
})
export class PageHeader {
  title = input.required<string>();
  subtitle = input<string>();
}
