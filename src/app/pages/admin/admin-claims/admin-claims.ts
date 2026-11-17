import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Dialog } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Message } from 'primeng/message';
import { ConfirmationService } from 'primeng/api';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClaimsService, ItemsService } from '../../../core/services/data.services';
import { NotifyService } from '../../../core/services/notify.service';
import { Claim, Item } from '../../../core/interfaces/models';
import { CLAIM_STATUS_OPTIONS } from '../../../core/constants/labels';
import { errorCode, errorMessage } from '../../../core/utils/api-error';
import { timeAgo } from '../../../core/utils/format';
import { PageHeader } from '../../../shared/components/page-header';
import { ClaimStatusTag, CodeTag, ItemStatusTag } from '../../../shared/components/tags';
import { EmptyState, ErrorState } from '../../../shared/components/empty-state';
import { SecureImage } from '../../../shared/components/secure-image';
import { FilePreview, PreviewTarget } from '../../../shared/components/file-preview';
import { ClaimTimeline } from '../../claims/claim-timeline';

type Decision = 'approve' | 'reject' | 'return';

@Component({
  selector: 'app-admin-claims',
  imports: [DatePipe, FormsModule, RouterLink, TableModule, Button, Select, Dialog, Textarea, InputText, IconField, InputIcon, Tooltip, Skeleton, Message, PageHeader, ClaimStatusTag, CodeTag, ItemStatusTag, EmptyState, ErrorState, SecureImage, FilePreview, ClaimTimeline],
  templateUrl: './admin-claims.html',
})
export class AdminClaimsPage implements OnInit {
  status = input<string>();
  q = input<string>();
  open = input<string>();
  private svc = inject(ClaimsService);
  private items = inject(ItemsService);
  private notify = inject(NotifyService);
  private confirm = inject(ConfirmationService);

  rows = signal<Claim[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  page = 1;
  limit = 10;
  statusFilter: string | null = 'pending';
  search = '';
  statusOptions = CLAIM_STATUS_OPTIONS;
  timeAgo = timeAgo;
  private search$ = new Subject<void>();

  // review dialog
  selected = signal<Claim | null>(null);
  found = signal<Item | null>(null);
  lost = signal<Item | null>(null);
  reviewLoading = signal(false);
  decision = signal<Decision | null>(null);
  note = '';
  acting = signal(false);
  actionError = signal<string | null>(null);
  preview = signal<PreviewTarget | null>(null);

  constructor() {
    this.search$.pipe(debounceTime(350), takeUntilDestroyed()).subscribe(() => this.reload());
  }

  ngOnInit() {
    if (this.status() !== undefined) this.statusFilter = this.status() || null;
    if (this.q()) { this.search = this.q()!; this.statusFilter = null; }
    if (this.open()) this.svc.get(this.open()!).subscribe({ next: (c) => this.review(c), error: () => undefined });
  }

  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list({ status: this.statusFilter, q: this.search.trim(), page: this.page, limit: this.limit }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: (err) => { this.error.set(errorMessage(err, 'Claims could not load.')); this.loading.set(false); },
    });
  }
  onLazy(e: TableLazyLoadEvent) { this.limit = e.rows ?? 10; this.page = Math.floor((e.first ?? 0) / this.limit) + 1; this.fetch(); }
  reload() { this.page = 1; this.fetch(); }
  typed() { this.search$.next(); }

  review(c: Claim) {
    this.selected.set(c);
    this.decision.set(null);
    this.actionError.set(null);
    this.found.set(null);
    this.lost.set(null);
    this.reviewLoading.set(true);
    if (c.foundItem?.id) this.items.get(c.foundItem.id).subscribe({ next: (i) => { this.found.set(i); this.reviewLoading.set(false); }, error: () => this.reviewLoading.set(false) });
    if (c.lostItem?.id) this.items.get(c.lostItem.id).subscribe({ next: (i) => this.lost.set(i), error: () => undefined });
  }
  closeReview() { this.selected.set(null); }
  details(i: Item) { return [i.color, i.brand, i.distinctiveFeatures].filter((x) => !!x).join(' · '); }

  start(d: Decision) {
    this.decision.set(d);
    this.note = '';
    this.actionError.set(null);
  }

  act() {
    const c = this.selected();
    const d = this.decision();
    if (!c || !d) return;
    if (d === 'reject' && this.note.trim().length < 5) { this.actionError.set('Give the student a reason (at least 5 characters).'); return; }
    this.acting.set(true);
    const req = d === 'approve' ? this.svc.approve(c.id, c.version, this.note.trim() || undefined) : d === 'reject' ? this.svc.reject(c.id, c.version, this.note.trim()) : this.svc.markReturned(c.id, c.version, this.note.trim() || undefined);
    req.subscribe({
      next: (updated) => {
        this.acting.set(false);
        this.notify.success(d === 'approve' ? 'Claim approved' : d === 'reject' ? 'Claim rejected' : 'Item marked returned', `${updated.foundItem?.code} · ${updated.claimant?.fullName}`);
        this.decision.set(null);
        this.review(updated);
        this.fetch();
      },
      error: (err) => {
        this.acting.set(false);
        const code = errorCode(err);
        this.actionError.set(code === 'STALE_VERSION' || code === 'INVALID_STATE' || code === 'ALREADY_APPROVED' ? `${errorMessage(err)} The list has been refreshed.` : errorMessage(err));
        if (code) { this.fetch(); this.svc.get(c.id).subscribe({ next: (fresh) => this.selected.set(fresh), error: () => undefined }); }
      },
    });
  }

  remove(c: Claim) {
    this.confirm.confirm({
      header: 'Delete this claim?', message: 'Only pending or rejected claims can be deleted. Approved and returned claims are kept as audit records.', icon: 'pi pi-trash',
      acceptLabel: 'Delete claim', rejectLabel: 'Cancel', acceptButtonProps: { severity: 'danger' }, rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.svc.remove(c.id).subscribe({
        next: () => { this.notify.success('Claim deleted'); this.selected.set(null); this.fetch(); },
        error: (err) => this.notify.error('Could not delete', errorMessage(err)),
      }),
    });
  }
}
