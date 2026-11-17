import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button, ButtonDirective } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { ConfirmationService } from 'primeng/api';
import { ItemsService } from '../../../core/services/data.services';
import { NotifyService } from '../../../core/services/notify.service';
import { Item } from '../../../core/interfaces/models';
import { errorMessage } from '../../../core/utils/api-error';
import { PageHeader } from '../../../shared/components/page-header';
import { CodeTag, ItemStatusTag, TypePill } from '../../../shared/components/tags';
import { EmptyState, ErrorState } from '../../../shared/components/empty-state';
import { SecureImage } from '../../../shared/components/secure-image';

@Component({
  selector: 'app-my-reports',
  imports: [DatePipe, FormsModule, RouterLink, TableModule, Button, ButtonDirective, SelectButton, Tooltip, Skeleton, PageHeader, CodeTag, ItemStatusTag, TypePill, EmptyState, ErrorState, SecureImage],
  template: `
    <app-page-header title="My reports" subtitle="Everything you've reported as lost or found. Found reports can be edited until someone claims them.">
      <a pButton routerLink="/items/new/lost" label="Report lost" icon="pi pi-exclamation-circle" [outlined]="true"></a>
      <a pButton routerLink="/items/new/found" label="Report found" icon="pi pi-inbox"></a>
    </app-page-header>
    <div class="mb-4"><p-selectbutton [options]="typeOptions" [(ngModel)]="typeFilter" (onChange)="reload()" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="Report type" /></div>
    @if (error()) {
      <div class="cf-card"><app-error-state [message]="error()!"><p-button label="Try again" icon="pi pi-refresh" (onClick)="fetch()" /></app-error-state></div>
    } @else {
      <div class="cf-card cf-table-wrap">
        <p-table [value]="rows()" [lazy]="true" (onLazyLoad)="onLazy($event)" [paginator]="true" [rows]="limit" [totalRecords]="total()" [loading]="loading()" [showLoader]="false" [rowHover]="true" responsiveLayout="stack" [breakpoint]="'768px'">
          <ng-template #header><tr><th>Item</th><th>Type</th><th>Where & when</th><th>Status</th><th class="text-right">Actions</th></tr></ng-template>
          <ng-template #body let-i>
            <tr>
              <td><div class="flex items-center gap-3"><span class="cf-thumb">@if (i.images[0]; as img) { <app-secure-image [fileId]="img.id" [url]="img.url" [alt]="i.title" /> } @else { <i class="pi pi-image"></i> }</span><div class="min-w-0"><p class="m-0 font-semibold truncate">{{ i.title }}</p><app-code-tag [code]="i.code" /></div></div></td>
              <td><app-type-pill [type]="i.reportType" /></td>
              <td><p class="m-0 text-sm">{{ i.locationName }}</p><p class="m-0 text-xs cf-muted">{{ i.eventDate | date: 'd MMM y' }}</p></td>
              <td><app-item-status [status]="i.status" /></td>
              <td class="text-right whitespace-nowrap">
                <a pButton [routerLink]="['/items', i.id]" icon="pi pi-eye" [text]="true" [rounded]="true" severity="secondary" pTooltip="View" [attr.aria-label]="'View ' + i.title"></a>
                @if (editable(i)) { <a pButton [routerLink]="['/items', i.id, 'edit']" icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" pTooltip="Edit" [attr.aria-label]="'Edit ' + i.title"></a> }
                @if (deletable(i)) { <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" pTooltip="Delete" (onClick)="remove(i)" [ariaLabel]="'Delete ' + i.title" /> }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="5">
              @if (loading()) { <div class="flex flex-col gap-2">@for (s of [1,2,3]; track s) { <p-skeleton height="2.75rem" /> }</div> }
              @else { <app-empty-state title="You haven't reported anything yet" message="Lost something, or found something that isn't yours?"><a pButton routerLink="/items/new/lost" label="Report lost item"></a><a pButton routerLink="/items/new/found" label="Report found item" [outlined]="true"></a></app-empty-state> }
            </td></tr>
          </ng-template>
        </p-table>
      </div>
    }
  `,
})
export class MyReportsPage implements OnInit {
  type = input<string>();
  private svc = inject(ItemsService);
  private confirm = inject(ConfirmationService);
  private notify = inject(NotifyService);
  rows = signal<Item[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  page = 1;
  limit = 10;
  typeFilter: string | null = null;
  typeOptions = [{ label: 'All', value: null }, { label: 'Lost', value: 'lost' }, { label: 'Found', value: 'found' }];

  ngOnInit() {
    this.typeFilter = this.type() ?? null;
  }
  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.mine({ type: this.typeFilter, page: this.page, limit: this.limit }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: (err) => { this.error.set(errorMessage(err, 'Your reports could not load.')); this.loading.set(false); },
    });
  }
  onLazy(e: TableLazyLoadEvent) {
    this.limit = e.rows ?? 10;
    this.page = Math.floor((e.first ?? 0) / this.limit) + 1;
    this.fetch();
  }
  reload() { this.page = 1; this.fetch(); }
  editable(i: Item) { return i.status !== 'returned' && (i.reportType === 'lost' || i.status === 'open'); }
  deletable(i: Item) { return ['open', 'closed'].includes(i.status); }
  remove(i: Item) {
    this.confirm.confirm({
      header: 'Delete this report?', message: `${i.code} · ${i.title} will be removed from the directory.`, icon: 'pi pi-trash',
      acceptLabel: 'Delete report', rejectLabel: 'Keep it', acceptButtonProps: { severity: 'danger' }, rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.svc.remove(i.id).subscribe({
        next: () => { this.notify.success('Report deleted', i.code); this.fetch(); },
        error: (err) => this.notify.error('Could not delete', errorMessage(err)),
      }),
    });
  }
}
