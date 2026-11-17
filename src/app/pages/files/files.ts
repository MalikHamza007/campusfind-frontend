import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';
import { FileUpload, FileSelectEvent } from 'primeng/fileupload';
import { ProgressBar } from 'primeng/progressbar';
import { ConfirmationService } from 'primeng/api';
import { FilesService } from '../../core/services/data.services';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { FilePurpose, StoredFile } from '../../core/interfaces/models';
import { errorMessage } from '../../core/utils/api-error';
import { formatBytes } from '../../core/utils/format';
import { PageHeader } from '../../shared/components/page-header';
import { EmptyState, ErrorState } from '../../shared/components/empty-state';
import { SecureImage } from '../../shared/components/secure-image';
import { FilePreview, PreviewTarget } from '../../shared/components/file-preview';

const PURPOSE_LABEL: Record<FilePurpose, string> = { item_image: 'Item photo', claim_evidence: 'Claim evidence', avatar: 'Profile photo' };

@Component({
  selector: 'app-files',
  imports: [DatePipe, FormsModule, RouterLink, TableModule, Button, Select, ToggleSwitch, Tooltip, Skeleton, Tag, FileUpload, ProgressBar, PageHeader, EmptyState, ErrorState, SecureImage, FilePreview],
  template: `
    <app-page-header title="My documents" subtitle="Photos and evidence you've uploaded. Files live in CampusFind's private storage — every view uses a link that expires after 60 seconds. Files attached to a report or claim can't be deleted.">
      <p-select [(ngModel)]="uploadPurpose" [options]="purposeOptions" optionLabel="label" optionValue="value" ariaLabel="Upload as" />
      <p-fileupload mode="basic" [customUpload]="true" [auto]="false" (onSelect)="upload($event)" [accept]="uploadPurpose === 'claim_evidence' ? 'image/jpeg,image/png,image/webp,application/pdf' : 'image/jpeg,image/png,image/webp'" chooseLabel="Upload file" chooseIcon="pi pi-upload" [disabled]="uploading()" />
    </app-page-header>
    @if (uploading()) { <p-progressbar [value]="progress()" styleClass="mb-4" [style]="{ height: '6px' }" /> }
    <section class="cf-card p-4 mb-4 flex flex-wrap gap-3 items-center" aria-label="Filters">
      <p-select [(ngModel)]="purpose" [options]="purposeOptions" optionLabel="label" optionValue="value" placeholder="All file types" [showClear]="true" (onChange)="reload()" ariaLabel="Purpose" />
      @if (auth.isAdmin()) { <label class="flex items-center gap-2 text-sm"><p-toggleswitch [(ngModel)]="all" (onChange)="reload()" ariaLabel="Show everyone's files" />Everyone's files</label> }
      <span class="ml-auto text-xs cf-muted">{{ total() }} files</span>
    </section>
    @if (error()) {
      <div class="cf-card"><app-error-state [message]="error()!"><p-button label="Try again" icon="pi pi-refresh" (onClick)="fetch()" /></app-error-state></div>
    } @else {
      <div class="cf-card cf-table-wrap">
        <p-table [value]="rows()" [lazy]="true" (onLazyLoad)="onLazy($event)" [paginator]="true" [rows]="limit" [totalRecords]="total()" [loading]="loading()" [showLoader]="false" [rowHover]="true" responsiveLayout="stack" [breakpoint]="'768px'">
          <ng-template #header><tr><th>File</th><th>Type</th><th>Size</th><th>Used by</th><th>Uploaded</th><th class="text-right">Actions</th></tr></ng-template>
          <ng-template #body let-f>
            <tr>
              <td><div class="flex items-center gap-3 min-w-0">
                <button type="button" class="cf-thumb border-0 p-0 cursor-pointer" (click)="preview.set(f)" [attr.aria-label]="'Preview ' + f.originalName">@if (f.mimeType.startsWith('image/')) { <app-secure-image [fileId]="f.id" [alt]="f.originalName" /> } @else { <i class="pi pi-file-pdf" style="color: var(--cf-lost)"></i> }</button>
                <div class="min-w-0"><p class="m-0 text-sm font-medium truncate max-w-[240px]">{{ f.originalName }}</p><p class="m-0 text-[11px] cf-muted">{{ f.mimeType }}@if (all && f.uploadedBy?.fullName) { · {{ f.uploadedBy.fullName }} }</p></div>
              </div></td>
              <td><p-tag [value]="purposeLabel(f.purpose)" severity="secondary" /></td>
              <td class="text-sm tabular-nums">{{ size(f.size) }}</td>
              <td class="text-sm">@if (f.usedBy; as u) { @if (u.type === 'item') { <a [routerLink]="['/items', u.id]" class="no-underline font-medium" style="color: var(--p-primary-600)">{{ u.label }}</a> } @else { {{ u.label }} } } @else { <span class="cf-muted">Not attached</span> }</td>
              <td class="text-sm">{{ f.createdAt | date: 'd MMM y' }}</td>
              <td class="text-right whitespace-nowrap">
                <p-button icon="pi pi-eye" [text]="true" [rounded]="true" severity="secondary" pTooltip="Preview" (onClick)="preview.set(f)" [ariaLabel]="'Preview ' + f.originalName" />
                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" [disabled]="f.inUse" [pTooltip]="f.inUse ? 'Attached — remove it from the report first' : 'Delete file'" (onClick)="remove(f)" [ariaLabel]="'Delete ' + f.originalName" />
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="6">
            @if (loading()) { <div class="flex flex-col gap-2">@for (s of [1,2,3]; track s) { <p-skeleton height="2.75rem" /> }</div> }
            @else { <app-empty-state title="No files yet" message="Photos you add to reports and evidence for claims will appear here." /> }
          </td></tr></ng-template>
        </p-table>
      </div>
    }
    <app-file-preview [(target)]="preview" />
  `,
})
export class FilesPage {
  auth = inject(AuthService);
  private svc = inject(FilesService);
  private notify = inject(NotifyService);
  private confirm = inject(ConfirmationService);
  rows = signal<StoredFile[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  uploading = signal(false);
  progress = signal(0);
  preview = signal<PreviewTarget | null>(null);
  page = 1;
  limit = 10;
  purpose: FilePurpose | null = null;
  uploadPurpose: FilePurpose = 'item_image';
  all = false;
  purposeOptions = (Object.keys(PURPOSE_LABEL) as FilePurpose[]).map((value) => ({ value, label: PURPOSE_LABEL[value] }));
  size = formatBytes;
  purposeLabel = (p: FilePurpose) => PURPOSE_LABEL[p];

  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list({ purpose: this.purpose, all: this.all ? 'true' : undefined, page: this.page, limit: this.limit }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: (err) => { this.error.set(errorMessage(err, 'Your files could not load.')); this.loading.set(false); },
    });
  }
  onLazy(e: TableLazyLoadEvent) { this.limit = e.rows ?? 10; this.page = Math.floor((e.first ?? 0) / this.limit) + 1; this.fetch(); }
  reload() { this.page = 1; this.fetch(); }
  upload(e: FileSelectEvent) {
    const file = e.currentFiles[0];
    if (!file) return;
    this.uploading.set(true);
    this.svc.upload(file, this.uploadPurpose).subscribe({
      next: (p) => this.progress.set(p.progress),
      error: (err) => { this.uploading.set(false); this.notify.error(`Could not upload ${file.name}`, errorMessage(err)); },
      complete: () => { this.uploading.set(false); this.notify.success('File uploaded', file.name); this.reload(); },
    });
  }
  remove(f: StoredFile) {
    this.confirm.confirm({
      header: 'Delete this file?', message: `${f.originalName} will be permanently removed from private storage. This can't be undone.`, icon: 'pi pi-trash',
      acceptLabel: 'Delete file', rejectLabel: 'Cancel', acceptButtonProps: { severity: 'danger' }, rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.svc.remove(f.id).subscribe({ next: () => { this.notify.success('File deleted', f.originalName); this.fetch(); }, error: (err) => this.notify.error('Could not delete', errorMessage(err)) }),
    });
  }
}
