import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, Button],
  template: `
    <div class="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <aside class="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden text-white" style="background: radial-gradient(120% 90% at 0% 0%, #1b6b60 0%, #0f3d38 55%, #082824 100%)">
        <div class="flex items-center gap-3 font-extrabold text-xl"><img src="favicon.svg" alt="" width="34" height="34" />CampusFind</div>
        <div class="relative z-10 max-w-md">
          <h2 class="text-4xl font-extrabold leading-[1.1] m-0">Every lost thing on campus has a tag waiting for it.</h2>
          <p class="mt-4 text-white/75 leading-relaxed">Report what you lost, log what you found, and the lost &amp; found office matches them up — with photos, a campus map and a verified handover.</p>
        </div>
        <!-- hanging tags illustration -->
        <svg class="absolute right-8 top-0 opacity-95" width="230" height="276" viewBox="0 0 300 360" aria-hidden="true">
          <path d="M150 0v70M90 0v140M220 0v40" stroke="rgba(255,255,255,.35)" stroke-width="2" />
          <g transform="rotate(-8 150 70)"><path d="M120 70h70l20 20v80a10 10 0 0 1-10 10h-80a10 10 0 0 1-10-10V80a10 10 0 0 1 10-10z" fill="#f4c95d" /><circle cx="135" cy="88" r="6" fill="#0f3d38" /><text x="128" y="130" font-family="Inter" font-weight="800" font-size="15" fill="#4a3a10">CF-F-2015</text><rect x="128" y="142" width="62" height="6" rx="3" fill="#4a3a10" opacity=".35" /><rect x="128" y="154" width="44" height="6" rx="3" fill="#4a3a10" opacity=".35" /></g>
          <g transform="rotate(10 90 140)"><path d="M60 140h60l18 18v70a10 10 0 0 1-10 10H60a10 10 0 0 1-10-10v-78a10 10 0 0 1 10-10z" fill="#ffffff" opacity=".92" /><circle cx="74" cy="156" r="5" fill="#0f3d38" /><text x="66" y="196" font-family="Inter" font-weight="800" font-size="13" fill="#c8385a">CF-L-1006</text></g>
          <g transform="rotate(4 220 40)"><path d="M200 40h44l14 14v52a8 8 0 0 1-8 8h-50a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8z" fill="#73cfbc" /><circle cx="212" cy="54" r="4" fill="#0f3d38" /></g>
        </svg>
        <p class="relative z-10 text-sm text-white/60 m-0">Handover and identity checks happen at the Lost &amp; Found Office, Admin Block.</p>
      </aside>
      <main class="relative flex items-center justify-center p-5 sm:p-10">
        <p-button class="absolute top-4 right-4" [icon]="theme.dark() ? 'pi pi-sun' : 'pi pi-moon'" [rounded]="true" [text]="true" severity="secondary" (onClick)="theme.toggle()" [ariaLabel]="theme.dark() ? 'Switch to light mode' : 'Switch to dark mode'" />
        <div class="w-full max-w-[440px]"><router-outlet /></div>
      </main>
    </div>
  `,
})
export class AuthLayout {
  theme = inject(ThemeService);
}
