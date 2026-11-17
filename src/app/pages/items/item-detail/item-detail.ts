import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Button, ButtonDirective } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { Message } from 'primeng/message';
import { ConfirmationService } from 'primeng/api';
import { ClaimsService, ItemsService } from '../../../core/services/data.services';
import { AuthService } from '../../../core/services/auth.service';
import { NotifyService } from '../../../core/services/notify.service';
import { Claim, Item } from '../../../core/interfaces/models';
import { errorMessage } from '../../../core/utils/api-error';
import { timeAgo } from '../../../core/utils/format';
import { CodeTag, ItemStatusTag, TypePill, CategoryLabel, ClaimStatusTag } from '../../../shared/components/tags';
import { ErrorState } from '../../../shared/components/empty-state';
import { SecureImage } from '../../../shared/components/secure-image';
import { ItemsMap } from '../../../shared/components/items-map';
import { FilePreview, PreviewTarget } from '../../../shared/components/file-preview';

@Component({
  selector: 'app-item-detail',
  imports: [DatePipe, RouterLink, Button, ButtonDirective, Skeleton, Message, CodeTag, ItemStatusTag, TypePill, CategoryLabel, ClaimStatusTag, ErrorState, SecureImage, ItemsMap, FilePreview],
  templateUrl: './item-detail.html',
})
export class ItemDetailPage implements OnInit {
  id = input.required<string>();
  auth = inject(AuthService);
  private svc = inject(ItemsService);
  private claimsSvc = inject(ClaimsService);
  private router = inject(Router);
  private confirm = inject(ConfirmationService);
  private notify = inject(NotifyService);

  item = signal<Item | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  active = signal(0);
  claims = signal<Claim[]>([]);
  myClaim = signal<Claim | null>(null);
  preview = signal<PreviewTarget | null>(null);
  timeAgo = timeAgo;

  pins = computed(() => {
    const i = this.item();
    return i ? [{ id: i.id, lat: i.coordinates.lat, lng: i.coordinates.lng, type: i.reportType, title: i.title, code: i.code, location: i.locationName }] : [];
  });
  canClaim = computed(() => {
    const i = this.item();
    return !!i && this.auth.can('claims.create') && i.reportType === 'found' && !i.isMine && ['open', 'claim_pending'].includes(i.status) && !this.myClaim();
  });
  canEdit = computed(() => {
    const i = this.item();
    return !!i && !i.deletedAt && (i.isMine || this.auth.isAdmin()) && i.status !== 'returned' && (this.auth.isAdmin() || i.reportType === 'lost' || i.status === 'open');
  });
  canDelete = computed(() => {
    const i = this.item();
    return !!i && !i.deletedAt && (i.isMine || this.auth.isAdmin()) && ['open', 'closed'].includes(i.status);
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.get(this.id()).subscribe({
      next: (i) => {
        this.item.set(i);
        this.loading.set(false);
        if (this.auth.isAdmin() && i.reportType === 'found') this.claimsSvc.list({ foundItemId: i.id, limit: 20 }).subscribe({ next: (r) => this.claims.set(r.data), error: () => undefined });
        if (this.auth.can('claims.own') && i.reportType === 'found')
          this.claimsSvc.list({ foundItemId: i.id, limit: 5 }).subscribe({ next: (r) => this.myClaim.set(r.data.find((c) => ['pending', 'approved', 'returned'].includes(c.status)) ?? null), error: () => undefined });
      },
      error: (err) => {
        this.error.set(err?.status === 404 ? 'This report does not exist or was removed.' : errorMessage(err, 'This report could not load.'));
        this.loading.set(false);
      },
    });
  }

  remove() {
    const i = this.item()!;
    this.confirm.confirm({
      header: 'Delete this report?',
      message: `${i.code} · ${i.title} will be removed from the directory. The office keeps a record for audit.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Delete report',
      rejectLabel: 'Keep it',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () =>
        this.svc.remove(i.id).subscribe({
          next: () => {
            this.notify.success('Report deleted', i.code);
            void this.router.navigate([this.auth.isAdmin() ? '/admin/items' : '/my-reports']);
          },
          error: (err) => this.notify.error('Could not delete', errorMessage(err)),
        }),
    });
  }
}
