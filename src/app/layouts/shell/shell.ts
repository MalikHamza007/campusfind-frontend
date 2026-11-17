import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { Menu } from 'primeng/menu';
import { Avatar } from 'primeng/avatar';
import { Tooltip } from 'primeng/tooltip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { NAV } from '../../core/constants/nav';
import { initials } from '../../core/utils/format';

@Component({
  selector: 'app-shell',
  imports: [NgTemplateOutlet, RouterOutlet, RouterLink, RouterLinkActive, FormsModule, Button, Drawer, Menu, Avatar, Tooltip, IconField, InputIcon, InputText],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  collapsed = signal(false);
  mobileOpen = signal(false);
  search = '';
  initials = computed(() => initials(this.auth.user()?.fullName));

  nav = computed(() =>
    NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || this.auth.can(i.permission)) })).filter((g) => g.items.length),
  );

  crumb = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.deepest()),
    ),
    { initialValue: this.deepest() },
  );

  userMenu: MenuItem[] = [
    { label: 'My profile', icon: 'pi pi-user', routerLink: '/profile' },
    { label: 'My documents', icon: 'pi pi-folder', routerLink: '/files' },
    { separator: true },
    { label: 'Sign out', icon: 'pi pi-sign-out', command: () => this.auth.logout() },
  ];

  private deepest(): string {
    let r = this.route.snapshot;
    while (r.firstChild) r = r.firstChild;
    return (r.data['crumb'] as string) ?? '';
  }

  runSearch() {
    const q = this.search.trim();
    void this.router.navigate(['/items'], { queryParams: q ? { q } : {} });
    this.search = '';
  }
}
