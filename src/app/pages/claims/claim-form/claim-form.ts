import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button, ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';
import { ClaimsService, ItemsService } from '../../../core/services/data.services';
import { NotifyService } from '../../../core/services/notify.service';
import { Item } from '../../../core/interfaces/models';
import { applyServerErrors, errorMessage } from '../../../core/utils/api-error';
import { PageHeader } from '../../../shared/components/page-header';
import { CodeTag, ItemStatusTag } from '../../../shared/components/tags';
import { ErrorState } from '../../../shared/components/empty-state';
import { SecureImage } from '../../../shared/components/secure-image';
import { AttachedFile, FileAttacher } from '../../../shared/components/image-uploader';

@Component({
  selector: 'app-claim-form',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, Button, ButtonDirective, Select, Textarea, Message, Skeleton, PageHeader, CodeTag, ItemStatusTag, ErrorState, SecureImage, FileAttacher],
  templateUrl: './claim-form.html',
})
export class ClaimFormPage implements OnInit {
  foundItemId = input.required<string>();
  private fb = inject(FormBuilder);
  private items = inject(ItemsService);
  private claims = inject(ClaimsService);
  private router = inject(Router);
  private notify = inject(NotifyService);

  item = signal<Item | null>(null);
  myLost = signal<{ label: string; value: string }[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  uploading = signal(false);
  formError = signal<string | null>(null);
  evidence = signal<AttachedFile[]>([]);

  form = this.fb.group({
    lostItemId: [null as string | null],
    ownershipEvidence: ['', [Validators.required, Validators.minLength(30), Validators.maxLength(2000)]],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.items.get(this.foundItemId()).subscribe({
      next: (i) => {
        if (i.reportType !== 'found') this.loadError.set('Claims can only be made on found-item reports.');
        else if (i.isMine) this.loadError.set('You reported this item as found, so you can’t claim it.');
        else if (!['open', 'claim_pending'].includes(i.status)) this.loadError.set('This item is no longer accepting claims.');
        this.item.set(i);
        this.loading.set(false);
      },
      error: (err) => { this.loadError.set(errorMessage(err, 'This item could not load.')); this.loading.set(false); },
    });
    this.items.mine({ type: 'lost', limit: 50 }).subscribe({
      next: (r) => this.myLost.set(r.data.filter((i) => ['open', 'claim_pending'].includes(i.status)).map((i) => ({ label: `${i.code} · ${i.title}`, value: i.id }))),
      error: () => this.myLost.set([]),
    });
  }

  submit() {
    this.formError.set(null);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.claims.create({ foundItemId: this.foundItemId(), lostItemId: v.lostItemId || undefined, ownershipEvidence: v.ownershipEvidence ?? '', evidenceFileIds: this.evidence().map((f) => f.id) }).subscribe({
      next: () => { this.notify.success('Claim submitted', 'The lost & found office will review it.'); void this.router.navigate(['/claims']); },
      error: (err) => { this.saving.set(false); applyServerErrors(this.form, err); this.formError.set(errorMessage(err)); },
    });
  }
}
