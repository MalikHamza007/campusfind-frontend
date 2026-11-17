import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button, ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';
import { ConfirmationService } from 'primeng/api';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ItemsService } from '../../../core/services/data.services';
import { NotifyService } from '../../../core/services/notify.service';
import { Item } from '../../../core/interfaces/models';
import { CATEGORY_OPTIONS, ITEM_STATUS_OPTIONS } from '../../../core/constants/labels';
import { errorMessage } from '../../../core/utils/api-error';
import { PageHeader } from '../../../shared/components/page-header';
import { CategoryLabel, CodeTag, ItemStatusTag, TypePill } from '../../../shared/components/tags';
import { EmptyState, ErrorState } from '../../../shared/components/empty-state';

@Component({
  selector: 'app-admin-items',
  imports: [DatePipe, FormsModule, RouterLink, TableModule, Button, ButtonDirective, Select, SelectButton, ToggleSwitch, InputText, IconField, InputIcon, Tooltip, Skeleton, Tag, PageHeader, CategoryLabel, CodeTag, ItemStatusTag, TypePill, EmptyState, ErrorState],
  template: `
    <app-page-header title="Item administration" subtitle="Every report on campus, including deleted ones. Close stale reports, fix details, or restore something removed by mistake.">
      <a pButton routerLink="/items/new/found" label="Log handed-in item" icon="pi pi-inbox"></a>
    </app-page-header>
    <section class="cf-card p-4 mb-4 flex flex-wrap gap-3 items-center" aria-label="Filters">
      <p-iconfield class="flex-1 min-w-[220px]"><p-inputicon styleClass="pi pi-search" /><input pInputText [(ngModel)]="q" (ngModelChange)="search$.next()" placeholder="Search title, code, place" aria-label="Search items" class="w-full" /></p-iconfield>
      <p-selectbutton [options]="typeOptions" [(ngModel)]="type" (onChange)="reload()" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="Type" />
      <p-select [(ngModel)]="status" [options]="statusOptions" optionLabel="label" optionValue="value" placeholder="Any status" [showClear]="true" (onChange)="reload()" ariaLabel="Status" />
      <p-select [(ngModel)]="category" [options]="categoryOptions" optionLabel="label" optionValue="value" placeholder="Any category" [showClear]="true" (onChange)="reload()" ariaLabel="Category" />
      <label class="flex items-center gap-2 text-sm"><p-toggleswitch [(ngModel)]="includeDeleted" (onChange)="reload()" ariaLabel="Include deleted reports" />Include deleted</label>
    </section>
    @if (error()) {
      <div class="cf-card"><app-error-state [message]="error()!"><p-button label="Try again" icon="pi pi-refresh" (onClick)="fetch()" /></app-error-state></div>
    } @else {
      <div class="cf-card cf-table-wrap">
        <p-table [value]="rows()" [lazy]="true" (onLazyLoad)="onLazy($event)" [paginator]="true" [rows]="limit" [totalRecords]="total()" [rowsPerPageOptions]="[10, 25, 50, 100]" [loading]="loading()" [showLoader]="false" [rowHover]="true" responsiveLayout="stack" [breakpoint]="'900px'">
          <ng-template #header><tr><th>Item</th><th>Type</th><th>Category</th><th>Reporter</th><th>Event date</th><th>Status</th><th class="text-right">Actions</th></tr></ng-template>
          <ng-template #body let-i>
            <tr [class.opacity-60]="i.deletedAt">
              <td><div class="flex flex-col gap-1"><span class="font-semibold">{{ i.title }}</span><span class="flex gap-2 items-center"><app-code-tag [code]="i.code" />@if (i.deletedAt) { <p-tag value="Deleted" severity="danger" /> }</span></div></td>
              <td><app-type-pill [type]="i.reportType" /></td>
              <td><app-category [category]="i.category" /></td>
              <td><p class="m-0 text-sm">{{ i.reporter.fullName }}</p><p class="m-0 text-xs cf-muted">{{ i.reporter.department }}</p></td>
              <td class="text-sm">{{ i.eventDate | date: 'd MMM y' }}</td>
              <td><app-item-status [status]="i.status" /></td>
              <td class="text-right whitespace-nowrap">
                <a pButton [routerLink]="['/items', i.id]" icon="pi pi-eye" [text]="true" [rounded]="true" severity="secondary" pTooltip="View" [attr.aria-label]="'View ' + i.title"></a>
                @if (!i.deletedAt) {
                  @if (i.status !== 'returned') { <a pButton [routerLink]="['/items', i.id, 'edit']" icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" pTooltip="Edit" [attr.aria-label]="'Edit ' + i.title"></a> }
                  @if (i.status === 'open') { <p-button icon="pi pi-lock" [text]="true" [rounded]="true" severity="secondary" pTooltip="Close report" (onClick)="setStatus(i, 'closed')" [ariaLabel]="'Close ' + i.title" /> }
                  @if (i.status === 'closed') { <p-button icon="pi pi-lock-open" [text]="true" [rounded]="true" severity="secondary" pTooltip="Reopen report" (onClick)="setStatus(i, 'open')" [ariaLabel]="'Reopen ' + i.title" /> }
                  @if (i.status === 'open' || i.status === 'closed') { <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" pTooltip="Delete" (onClick)="remove(i)" [ariaLabel]="'Delete ' + i.title" /> }
                } @else { <p-button icon="pi pi-replay" [text]="true" [rounded]="true" pTooltip="Restore" (onClick)="restore(i)" [ariaLabel]="'Restore ' + i.title" /> }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="7">
            @if (loading()) { <div class="flex flex-col gap-2">@for (s of [1,2,3,4]; track s) { <p-skeleton height="2.75rem" /> }</div> } @else { <app-empty-state title="No items match these filters" /> }
          </td></tr></ng-template>
        </p-table>
      </div>
    }
  `,
})
export class AdminItemsPage {
  private svc = inject(ItemsService);
  private notify = inject(NotifyService);
  private confirm = inject(ConfirmationService);
  rows = signal<Item[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  page = 1;
  limit = 10;
  q = '';
  type: string | null = null;
  status: string | null = null;
  category: string | null = null;
  includeDeleted = false;
  typeOptions = [{ label: 'All', value: null }, { label: 'Lost', value: 'lost' }, { label: 'Found', value: 'found' }];
  statusOptions = ITEM_STATUS_OPTIONS;
  categoryOptions = CATEGORY_OPTIONS;
  search$ = new Subject<void>();

  constructor() { this.search$.pipe(debounceTime(350), takeUntilDestroyed()).subscribe(() => this.reload()); }
  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list({ q: this.q.trim(), type: this.type, status: this.status, category: this.category, includeDeleted: this.includeDeleted ? 'true' : undefined, page: this.page, limit: this.limit }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: (err) => { this.error.set(errorMessage(err, 'Items could not load.')); this.loading.set(false); },
    });
  }
  onLazy(e: TableLazyLoadEvent) { this.limit = e.rows ?? 10; this.page = Math.floor((e.first ?? 0) / this.limit) + 1; this.fetch(); }
  reload() { this.page = 1; this.fetch(); }
  setStatus(i: Item, status: 'open' | 'closed') {
    this.svc.update(i.id, { status, version: i.version }).subscribe({
      next: () => { this.notify.success(status === 'closed' ? 'Report closed' : 'Report reopened', i.code); this.fetch(); },
      error: (err) => this.notify.error('Could not update', errorMessage(err)),
    });
  }
  remove(i: Item) {
    this.confirm.confirm({
      header: 'Delete this report?', message: `${i.code} · ${i.title} will be hidden from students. You can restore it later.`, icon: 'pi pi-trash',
      acceptLabel: 'Delete report', rejectLabel: 'Cancel', acceptButtonProps: { severity: 'danger' }, rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.svc.remove(i.id).subscribe({ next: () => { this.notify.success('Report deleted', i.code); this.fetch(); }, error: (err) => this.notify.error('Could not delete', errorMessage(err)) }),
    });
  }
  restore(i: Item) {
    this.svc.restore(i.id).subscribe({ next: () => { this.notify.success('Report restored', i.code); this.fetch(); }, error: (err) => this.notify.error('Could not restore', errorMessage(err)) });
  }
}
