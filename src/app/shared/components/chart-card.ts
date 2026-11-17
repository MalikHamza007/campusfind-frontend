import { Component, input, signal } from '@angular/core';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';

export interface ChartTable { columns: string[]; rows: (string | number)[][] }

/** Card around a chart with a "Show table" toggle — every chart has an accessible table view. */
@Component({
  selector: 'app-chart-card',
  imports: [ToggleSwitch, FormsModule],
  template: `
    <section class="cf-card cf-card-pad h-full flex flex-col" [attr.aria-label]="title()">
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="min-w-0">
          <h2 class="cf-section-title">{{ title() }}</h2>
          @if (subtitle()) { <p class="cf-section-sub">{{ subtitle() }}</p> }
        </div>
        @if (table()) {
          <label class="flex items-center gap-2 text-xs cf-muted shrink-0 cursor-pointer">
            <p-toggleswitch [(ngModel)]="showTable" [ariaLabel]="'Show ' + title() + ' as a table'" />Table
          </label>
        }
      </div>
      @if (showTable && table(); as t) {
        <div class="overflow-auto max-h-[300px]">
          <table class="w-full text-sm border-collapse">
            <thead><tr>@for (c of t.columns; track c) { <th class="text-left font-semibold py-2 px-2 border-b" style="border-color: var(--cf-border)">{{ c }}</th> }</tr></thead>
            <tbody>
              @for (r of t.rows; track $index) {
                <tr>@for (v of r; track $index) { <td class="py-1.5 px-2 border-b tabular-nums" style="border-color: var(--cf-border)">{{ v }}</td> }</tr>
              } @empty { <tr><td class="py-4 cf-muted" [attr.colspan]="t.columns.length">No data for these filters.</td></tr> }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="flex-1 min-h-[240px] relative"><ng-content /></div>
      }
    </section>
  `,
})
export class ChartCard {
  title = input.required<string>();
  subtitle = input<string>();
  table = input<ChartTable | null>(null);
  showTable = false;
  readonly _ = signal(0);
}
