import { Component, inject, model, signal, effect, DestroyRef, ElementRef, viewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FilesService } from '../../core/services/data.services';
import { formatBytes } from '../../core/utils/format';

export interface PreviewTarget { id: string; originalName: string; mimeType: string; size?: number }

/** In-app viewer for private-bucket files: images inline, PDFs in an embedded viewer, anything else download-only. */
@Component({
  selector: 'app-file-preview',
  imports: [Dialog, Button, ProgressSpinner],
  template: `
    <p-dialog [visible]="!!target()" (visibleChange)="!$event && close()" [modal]="true" [header]="target()?.originalName ?? 'Preview'" [style]="{ width: 'min(960px, 96vw)' }" [dismissableMask]="true" [draggable]="false">
      <div class="min-h-[300px] grid place-items-center rounded-xl overflow-hidden" style="background: var(--cf-surface-2)">
        @if (loading()) {
          <p-progress-spinner strokeWidth="4" [style]="{ width: '42px', height: '42px' }" ariaLabel="Loading preview" />
        } @else if (error()) {
          <div class="text-center p-8"><p class="m-0 mb-3">{{ error() }}</p><p-button label="Try again" icon="pi pi-refresh" size="small" (onClick)="load()" /></div>
        } @else if (kind() === 'image' && imageUrl()) {
          <img [src]="imageUrl()" [alt]="target()?.originalName" class="max-h-[70vh] max-w-full object-contain" />
        }
        @if (kind() === 'pdf' && !error()) {
          <div #pdfHost class="w-full max-h-[70vh] overflow-auto flex flex-col items-center gap-3 p-3" [class.hidden]="loading()" role="document" aria-label="PDF preview"></div>
        } @else if (kind() === 'other') {
          <p class="cf-muted p-8 text-center">This file type can't be previewed in the browser. Download it instead.</p>
        }
      </div>
      <ng-template #footer>
        <span class="cf-muted text-xs mr-auto self-center">{{ meta() }} · served from private storage through a 60-second link</span>
        <p-button label="Download" icon="pi pi-download" [outlined]="true" (onClick)="download()" />
        <p-button label="Close" (onClick)="close()" />
      </ng-template>
    </p-dialog>
  `,
})
export class FilePreview {
  target = model<PreviewTarget | null>(null);
  private api = inject(ApiService);
  private files = inject(FilesService);
  private sanitizer = inject(DomSanitizer);
  loading = signal(false);
  error = signal<string | null>(null);
  imageUrl = signal<SafeUrl | null>(null);
  kind = signal<'image' | 'pdf' | 'other'>('other');
  meta = signal('');
  private objectUrl: string | null = null;
  private blob: Blob | null = null;
  private pdfHost = viewChild<ElementRef<HTMLDivElement>>('pdfHost');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());
    effect(() => {
      if (this.target()) this.load();
    });
  }

  load() {
    const t = this.target();
    if (!t) return;
    this.kind.set(t.mimeType.startsWith('image/') ? 'image' : t.mimeType === 'application/pdf' ? 'pdf' : 'other');
    this.meta.set(`${t.mimeType}${t.size ? ' · ' + formatBytes(t.size) : ''}`);
    this.loading.set(true);
    this.error.set(null);
    this.files.signedUrl(t.id).pipe(switchMap((l) => this.api.blob(l.url))).subscribe({
      next: (blob) => {
        this.revoke();
        this.blob = blob;
        this.objectUrl = URL.createObjectURL(blob);
        if (this.kind() === 'image') this.imageUrl.set(this.sanitizer.bypassSecurityTrustUrl(this.objectUrl));
        if (this.kind() === 'pdf') void this.renderPdf(blob);
        else this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load this file. The link may have expired.');
        this.loading.set(false);
      },
    });
  }

  /** Render every page with pdf.js onto canvases — works in every browser, no PDF plugin needed. */
  private async renderPdf(blob: Blob) {
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), isEvalSupported: false }).promise;
      this.loading.set(false);
      await new Promise((r) => setTimeout(r));
      const host = this.pdfHost()?.nativeElement;
      if (!host) return;
      host.innerHTML = '';
      const width = Math.min(host.clientWidth || 820, 820) - 24;
      for (let n = 1; n <= Math.min(doc.numPages, 20); n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const scale = width / base.width;
        const ratio = window.devicePixelRatio || 1;
        const vp = page.getViewport({ scale: scale * ratio });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.width = `${vp.width / ratio}px`;
        canvas.style.boxShadow = '0 2px 12px rgb(0 0 0 / .15)';
        canvas.style.background = '#fff';
        canvas.setAttribute('aria-label', `Page ${n}`);
        host.appendChild(canvas);
        await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
      }
    } catch {
      this.loading.set(false);
      this.error.set('This PDF could not be displayed. Download it instead.');
    }
  }

  download() {
    const t = this.target();
    if (!t) return;
    const save = (b: Blob) => {
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u;
      a.download = t.originalName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    };
    if (this.blob) save(this.blob);
    else this.files.signedUrl(t.id).pipe(switchMap((l) => this.api.blob(l.url))).subscribe(save);
  }

  close() {
    this.target.set(null);
    this.revoke();
  }
  private revoke() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.blob = null;
    this.imageUrl.set(null);
  }
}
