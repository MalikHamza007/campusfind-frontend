import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button, ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { ConfirmationService } from 'primeng/api';
import { ClaimsService } from '../../../core/services/data.services';
import { NotifyService } from '../../../core/services/notify.service';
import { Claim } from '../../../core/interfaces/models';
import { CLAIM_STATUS_OPTIONS } from '../../../core/constants/labels';
import { errorMessage } from '../../../core/utils/api-error';
import { PageHeader } from '../../../shared/components/page-header';
import { ClaimStatusTag, CodeTag } from '../../../shared/components/tags';
import { EmptyState, ErrorState } from '../../../shared/components/empty-state';
import { FilePreview, PreviewTarget } from '../../../shared/components/file-preview';
import { ClaimTimeline } from '../claim-timeline';

@Component({
  selector: 'app-my-claims',
  imports: [DatePipe, FormsModule, RouterLink, TableModule, Button, ButtonDirective, Select, Tooltip, Skeleton, PageHeader, ClaimStatusTag, CodeTag, EmptyState, ErrorState, FilePreview, ClaimTimeline],
  template: `
    <app-page-header title="My claims" subtitle="Items you've said are yours. Expand a claim to follow its progress; approved items are collected at the Lost & Found Office with your university ID.">
      <a pButton routerLink="/items" [queryParams]="{ type: 'found', status: 'open' }" label="Browse found items" icon="pi pi-search"></a>
    </app-page-header>
    <div class="mb-4 max-w-xs"><p-select [(ngModel)]="statusFilter" [options]="statusOptions" optionLabel="label" optionValue="value" placeholder="All statuses" [showClear]="true" (onChange)="reload()" ariaLabel="Filter by status" [fluid]="true" /></div>
    @if (error()) {
      <div class="cf-card"><app-error-state [message]="error()!"><p-button label="Try again" icon="pi pi-refresh" (onClick)="fetch()" /></app-error-state></div>
    } @else {
      <div class="cf-card cf-table-wrap">
        <p-table [value]="rows()" dataKey="id" [lazy]="true" (onLazyLoad)="onLazy($event)" [paginator]="true" [rows]="limit" [totalRecords]="total()" [loading]="loading()" [showLoader]="false" responsiveLayout="stack" [breakpoint]="'768px'">
          <ng-template #header><tr><th class="w-12"></th><th>Found item</th><th>Submitted</th><th>Handled by</th><th>Status</th><th class="text-right">Actions</th></tr></ng-template>
          <ng-template #body let-c let-expanded="expanded">
            <tr>
              <td><p-button type="button" [pRowToggler]="c" [text]="true" [rounded]="true" severity="secondary" [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" [ariaLabel]="expanded ? 'Hide progress' : 'Show progress'" /></td>
              <td><div class="flex flex-col gap-1"><span class="font-semibold">{{ c.foundItem?.title }}</span><span class="flex items-center gap-2"><app-code-tag [code]="c.foundItem?.code ?? ''" />@if (c.lostItem) { <span class="text-xs cf-muted">linked to {{ c.lostItem.code }}</span> }</span></div></td>
              <td class="text-sm">{{ c.createdAt | date: 'd MMM y' }}</td>
              <td class="text-sm">@if (c.assignedTo) { {{ c.assignedTo.fullName }}<br /><span class="text-xs cf-muted">{{ c.assignedTo.department }}</span> } @else if (c.status === 'pending') { <span class="cf-muted">Waiting for staff</span> } @else { <span class="cf-muted">—</span> }</td>
              <td><app-claim-status [status]="c.status" /></td>
              <td class="text-right whitespace-nowrap">
                <a pButton [routerLink]="['/items', c.foundItem?.id]" icon="pi pi-eye" [text]="true" [rounded]="true" severity="secondary" pTooltip="View item" [attr.aria-label]="'View ' + c.foundItem?.title"></a>
                @if (c.status === 'pending') { <p-button icon="pi pi-undo" [text]="true" [rounded]="true" severity="danger" pTooltip="Withdraw claim" (onClick)="withdraw(c)" ariaLabel="Withdraw claim" /> }
              </td>
            </tr>
          </ng-template>
          <ng-template #expandedrow let-c>
            <tr><td colspan="6">
              <div class="grid md:grid-cols-[280px_1fr] gap-6 p-2">
                <app-claim-timeline [claim]="c" />
                <div>
                  <p class="text-xs font-semibold cf-muted m-0 mb-1">Your evidence</p>
                  <p class="m-0 text-sm leading-relaxed">{{ c.ownershipEvidence }}</p>
                  @if (c.evidence.length) {
                    <div class="flex flex-wrap gap-2 mt-3">@for (f of c.evidence; track f.id) { <p-button [label]="f.originalName" [icon]="f.mimeType === 'application/pdf' ? 'pi pi-file-pdf' : 'pi pi-image'" size="small" [outlined]="true" severity="secondary" (onClick)="preview.set(f)" /> }</div>
                  }
                </div>
              </div>
            </td></tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr><td colspan="6">
              @if (loading()) { <div class="flex flex-col gap-2">@for (s of [1,2,3]; track s) { <p-skeleton height="2.75rem" /> }</div> }
              @else { <app-empty-state title="No claims yet" message="If you see your belonging in the directory, open it and choose “This is mine”."><a pButton routerLink="/items" [queryParams]="{ type: 'found' }" label="Browse found items"></a></app-empty-state> }
            </td></tr>
          </ng-template>
        </p-table>
      </div>
    }
    <app-file-preview [(target)]="preview" />
  `,
})
export class MyClaimsPage implements OnInit {
  status = input<string>();
  private svc = inject(ClaimsService);
  private confirm = inject(ConfirmationService);
  private notify = inject(NotifyService);
  rows = signal<Claim[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  preview = signal<PreviewTarget | null>(null);
  page = 1;
  limit = 10;
  statusFilter: string | null = null;
  statusOptions = CLAIM_STATUS_OPTIONS;

  ngOnInit() { this.statusFilter = this.status() ?? null; }
  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list({ status: this.statusFilter, page: this.page, limit: this.limit }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: (err) => { this.error.set(errorMessage(err, 'Your claims could not load.')); this.loading.set(false); },
    });
  }
  onLazy(e: TableLazyLoadEvent) { this.limit = e.rows ?? 10; this.page = Math.floor((e.first ?? 0) / this.limit) + 1; this.fetch(); }
  reload() { this.page = 1; this.fetch(); }
  withdraw(c: Claim) {
    this.confirm.confirm({
      header: 'Withdraw this claim?', message: `Your claim on ${c.foundItem?.code} · ${c.foundItem?.title} will be closed. You can't reopen it.`, icon: 'pi pi-undo',
      acceptLabel: 'Withdraw claim', rejectLabel: 'Keep it', acceptButtonProps: { severity: 'danger' }, rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.svc.withdraw(c.id).subscribe({
        next: () => { this.notify.success('Claim withdrawn'); this.fetch(); },
        error: (err) => this.notify.error('Could not withdraw', errorMessage(err)),
      }),
    });
  }
}
