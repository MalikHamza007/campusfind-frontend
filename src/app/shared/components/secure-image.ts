import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FilesService } from '../../core/services/data.services';

/**
 * Renders an image from the private bucket. It fetches the bytes through the 60-second signed link and shows a blob URL;
 * if the link has expired (410/403) it asks the API for a fresh one transparently.
 */
@Component({
  selector: 'app-secure-image',
  template: `
    @if (src(); as s) {
      <img [src]="s" [alt]="alt()" [class]="imgClass()" loading="lazy" />
    } @else if (failed()) {
      <div class="w-full h-full grid place-items-center cf-muted" [attr.aria-label]="'Image unavailable: ' + alt()"><i class="pi pi-image"></i></div>
    } @else {
      <div class="w-full h-full animate-pulse" style="background: var(--cf-surface-2)" aria-hidden="true"></div>
    }
  `,
  host: { class: 'block w-full h-full' },
})
export class SecureImage {
  fileId = input.required<string>();
  url = input<string | undefined>();
  alt = input('');
  imgClass = input('w-full h-full object-cover');

  private api = inject(ApiService);
  private files = inject(FilesService);
  private sanitizer = inject(DomSanitizer);
  src = signal<SafeUrl | null>(null);
  failed = signal(false);
  private objectUrl: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());
    effect(() => {
      const id = this.fileId();
      const url = this.url();
      this.load(id, url);
    });
  }

  private load(id: string, url?: string) {
    this.failed.set(false);
    const fresh$ = this.files.signedUrl(id).pipe(switchMap((l) => this.api.blob(l.url)));
    const first$ = url ? this.api.blob(url) : fresh$;
    first$
      .pipe(
        catchError((err: unknown) => (url && err instanceof HttpErrorResponse && [403, 410].includes(err.status) ? fresh$ : throwError(() => err))),
        catchError(() => {
          this.failed.set(true);
          return of(null);
        }),
      )
      .subscribe((blob) => {
        if (!blob) return;
        this.revoke();
        this.objectUrl = URL.createObjectURL(blob);
        this.src.set(this.sanitizer.bypassSecurityTrustUrl(this.objectUrl));
      });
  }
  private revoke() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
