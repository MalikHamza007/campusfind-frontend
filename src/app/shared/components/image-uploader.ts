import { Component, inject, input, model, output, signal } from '@angular/core';
import { FileUpload, FileSelectEvent } from 'primeng/fileupload';
import { ProgressBar } from 'primeng/progressbar';
import { Button } from 'primeng/button';
import { Tooltip } from 'primeng/tooltip';
import { FilesService } from '../../core/services/data.services';
import { NotifyService } from '../../core/services/notify.service';
import { errorMessage } from '../../core/utils/api-error';
import { FilePurpose } from '../../core/interfaces/models';
import { SecureImage } from './secure-image';
import { formatBytes } from '../../core/utils/format';

export interface AttachedFile { id: string; originalName: string; mimeType: string; size: number; url?: string }

/** Uploads to the private bucket immediately (multipart, with progress) and keeps a list of attached file ids. */
@Component({
  selector: 'app-file-attacher',
  imports: [FileUpload, ProgressBar, Button, Tooltip, SecureImage],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-3">
        @for (f of files(); track f.id) {
          <div class="relative w-28 h-28 rounded-xl overflow-hidden border" style="border-color: var(--cf-border); background: var(--cf-surface-2)">
            @if (f.mimeType.startsWith('image/')) {
              <app-secure-image [fileId]="f.id" [url]="f.url" [alt]="f.originalName" />
            } @else {
              <div class="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center"><i class="pi pi-file-pdf text-2xl" style="color: var(--cf-lost)"></i><span class="text-[10px] leading-tight break-all line-clamp-2">{{ f.originalName }}</span></div>
            }
            <p-button icon="pi pi-times" [rounded]="true" severity="secondary" size="small" class="absolute top-1 right-1" (onClick)="remove(f.id)" [ariaLabel]="'Remove ' + f.originalName" pTooltip="Remove" />
          </div>
        }
        @if (files().length < max()) {
          <p-fileupload mode="basic" [auto]="false" [customUpload]="true" (onSelect)="onSelect($event)" [multiple]="true" [accept]="accept()" [maxFileSize]="maxBytes()"
            [chooseLabel]="files().length ? 'Add more' : chooseLabel()" chooseIcon="pi pi-upload" [disabled]="uploading()" />
        }
      </div>
      @if (uploading()) { <p-progressbar [value]="progress()" [style]="{ height: '6px' }" /> }
      <span class="cf-hint">{{ hint() }} · up to {{ max() }} files, {{ sizeLabel() }} each. Stored privately; only people allowed to see this report can view them.</span>
    </div>
  `,
})
export class FileAttacher {
  purpose = input.required<FilePurpose>();
  max = input(5);
  maxBytes = input(5 * 1024 * 1024);
  accept = input('image/jpeg,image/png,image/webp');
  chooseLabel = input('Upload photos');
  hint = input('JPEG, PNG or WebP');
  files = model<AttachedFile[]>([]);
  busyChange = output<boolean>();
  private svc = inject(FilesService);
  private notify = inject(NotifyService);
  uploading = signal(false);
  progress = signal(0);
  sizeLabel = () => formatBytes(this.maxBytes());

  onSelect(e: FileSelectEvent) {
    const room = this.max() - this.files().length;
    const queue = [...e.currentFiles].slice(0, room);
    if (e.currentFiles.length > room) this.notify.warn(`Only ${this.max()} files allowed`, 'Extra files were skipped.');
    this.next(queue);
  }

  private next(queue: File[]) {
    const file = queue.shift();
    if (!file) {
      this.uploading.set(false);
      this.busyChange.emit(false);
      return;
    }
    this.uploading.set(true);
    this.busyChange.emit(true);
    this.progress.set(0);
    this.svc.upload(file, this.purpose()).subscribe({
      next: (p) => {
        this.progress.set(p.progress);
        if (p.file) this.files.update((list) => [...list, { id: p.file!.id, originalName: p.file!.originalName, mimeType: p.file!.mimeType, size: p.file!.size, url: p.file!.url }]);
      },
      error: (err) => {
        this.notify.error(`Could not upload ${file.name}`, errorMessage(err));
        this.next(queue);
      },
      complete: () => this.next(queue),
    });
  }

  remove(id: string) {
    this.files.update((list) => list.filter((f) => f.id !== id));
  }
}
