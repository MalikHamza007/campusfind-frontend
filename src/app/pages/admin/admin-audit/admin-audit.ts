import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Skeleton } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';
import { DashboardService } from '../../../core/services/data.services';
import { AuditEntry } from '../../../core/interfaces/models';
import { ACTION_LABELS } from '../../../core/constants/labels';
import { errorMessage } from '../../../core/utils/api-error';
import { toIsoDate } from '../../../core/utils/format';
import { PageHeader } from '../../../shared/components/page-header';
import { EmptyState, ErrorState } from '../../../shared/components/empty-state';

@Component({
  selector: 'app-admin-audit',
  imports: [DatePipe, FormsModule, TableModule, Button, Select, DatePicker, Skeleton, Tag, PageHeader, EmptyState, ErrorState],
  template: `
    <app-page-header title="Activity audit" subtitle="Append-only record of sign-ins, reports, claims, reviews, handovers and file changes. Entries can't be edited or deleted." />
    <section class="cf-card p-4 mb-4 flex flex-wrap gap-3" aria-label="Filters">
      <p-select [(ngModel)]="action" [options]="actionOptions" optionLabel="label" optionValue="value" placeholder="Any activity" [showClear]="true" (onChange)="reload()" ariaLabel="Activity type" />
      <p-select [(ngModel)]="entityType" [options]="entityOptions" optionLabel="label" optionValue="value" placeholder="Any record type" [showClear]="true" (onChange)="reload()" ariaLabel="Record type" />
      <p-datepicker [(ngModel)]="range" selectionMode="range" [readonlyInput]="true" placeholder="Date range" [showIcon]="true" dateFormat="d M yy" [showButtonBar]="true" (onSelect)="range?.[1] && reload()" (onClearClick)="reload()" appendTo="body" ariaLabel="Date range" />
    </section>
    @if (error()) {
      <div class="cf-card"><app-error-state [message]="error()!"><p-button label="Try again" icon="pi pi-refresh" (onClick)="fetch()" /></app-error-state></div>
    } @else {
      <div class="cf-card cf-table-wrap">
        <p-table [value]="rows()" [lazy]="true" (onLazyLoad)="onLazy($event)" [paginator]="true" [rows]="limit" [totalRecords]="total()" [rowsPerPageOptions]="[20, 50, 100]" [loading]="loading()" [showLoader]="false" responsiveLayout="stack" [breakpoint]="'900px'">
          <ng-template #header><tr><th>When</th><th>Who</th><th>Activity</th><th>Record</th><th>Details</th><th>IP</th></tr></ng-template>
          <ng-template #body let-a>
            <tr>
              <td class="text-sm whitespace-nowrap">{{ a.createdAt | date: 'd MMM y, HH:mm' }}</td>
              <td><p class="m-0 text-sm font-medium">{{ a.actor?.fullName ?? 'System' }}</p>@if (a.actor) { <p class="m-0 text-xs cf-muted">{{ a.actor.role }}</p> }</td>
              <td class="text-sm">{{ label(a.action) }}<br /><code class="text-[11px] cf-muted">{{ a.action }}</code></td>
              <td><p-tag [value]="a.entityType" severity="secondary" /></td>
              <td class="text-xs cf-muted max-w-[280px]"><span class="line-clamp-2 break-all">{{ summary(a) }}</span></td>
              <td class="text-xs cf-muted tabular-nums">{{ a.ip || '—' }}</td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="6">
            @if (loading()) { <div class="flex flex-col gap-2">@for (s of [1,2,3,4]; track s) { <p-skeleton height="2.5rem" /> }</div> } @else { <app-empty-state title="No activity in this range" /> }
          </td></tr></ng-template>
        </p-table>
      </div>
    }
  `,
})
export class AdminAuditPage {
  private svc = inject(DashboardService);
  rows = signal<AuditEntry[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  page = 1;
  limit = 20;
  action: string | null = null;
  entityType: string | null = null;
  range: Date[] | null = null;
  actionOptions = [
    { label: 'Reports', value: 'item.' }, { label: 'Claims', value: 'claim.' }, { label: 'Approvals', value: 'claim.approved' }, { label: 'Handovers', value: 'claim.returned' },
    { label: 'Files', value: 'file.' }, { label: 'Sign-ins', value: 'auth.' }, { label: 'Profile & access', value: 'user.' },
  ];
  entityOptions = ['item', 'claim', 'file', 'user'].map((v) => ({ label: v[0].toUpperCase() + v.slice(1), value: v }));

  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.audit({ action: this.action, entityType: this.entityType, dateFrom: toIsoDate(this.range?.[0]), dateTo: toIsoDate(this.range?.[1] ?? this.range?.[0]), page: this.page, limit: this.limit }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: (err) => { this.error.set(errorMessage(err, 'The audit log could not load.')); this.loading.set(false); },
    });
  }
  onLazy(e: TableLazyLoadEvent) { this.limit = e.rows ?? 20; this.page = Math.floor((e.first ?? 0) / this.limit) + 1; this.fetch(); }
  reload() { this.page = 1; this.fetch(); }
  label(a: string) { const l = ACTION_LABELS[a] ?? a; return l[0].toUpperCase() + l.slice(1); }
  summary(a: AuditEntry) {
    return Object.entries(a.metadata ?? {}).filter(([k]) => !k.endsWith('Id')).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ') || '—';
  }
}
