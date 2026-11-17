import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';



@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonDirective],
  template: `
  <div class="min-h-screen grid place-items-center p-6">
    <div class="text-center max-w-md">
      <span class="cf-code-tag text-base! px-5! py-1.5!">404</span>
      <h1 class="text-3xl font-extrabold mt-6 mb-2">This page went missing</h1>
      <p class="cf-muted m-0 mb-8">Nobody has handed it in yet. Check the address, or head back to somewhere familiar.</p>
      <div class="flex gap-3 justify-center flex-wrap">
        <a pButton label="Go to dashboard" icon="pi pi-home" routerLink="/dashboard"></a>
        <a pButton label="Search the directory" icon="pi pi-search" [outlined]="true" routerLink="/items"></a>
        @if (!auth.isLoggedIn()) { <a pButton label="Sign in" [text]="true" routerLink="/login"></a> }
      </div>
    </div>
  </div>`,
})
export class NotFoundPage {
  auth = inject(AuthService);
}

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, ButtonDirective],
  template: `
  <div class="min-h-screen grid place-items-center p-6">
    <div class="text-center max-w-md">
      <span class="cf-code-tag text-base! px-5! py-1.5!">403</span>
      <h1 class="text-3xl font-extrabold mt-6 mb-2">You don’t have access to this page</h1>
      <p class="cf-muted m-0 mb-8">This area is for the lost &amp; found office. If you think you should have access, contact an administrator.</p>
      <div class="flex gap-3 justify-center flex-wrap">
        <a pButton label="Go to dashboard" icon="pi pi-home" routerLink="/dashboard"></a>
        <a pButton label="Search the directory" icon="pi pi-search" [outlined]="true" routerLink="/items"></a>
        @if (!auth.isLoggedIn()) { <a pButton label="Sign in" [text]="true" routerLink="/login"></a> }
      </div>
    </div>
  </div>`,
})
export class ForbiddenPage {
  auth = inject(AuthService);
}
