import { Component, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';
import { Avatar } from 'primeng/avatar';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ROLE_ICON, ROLE_LABEL, ROLE_SEVERITY } from '../../../core/constants/permissions';
import { Role } from '../../../core/interfaces/models';
import { ConfirmationService } from 'primeng/api';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UsersService } from '../../../core/services/data.services';
import { AuthService } from '../../../core/services/auth.service';
import { NotifyService } from '../../../core/services/notify.service';
import { User } from '../../../core/interfaces/models';
import { errorMessage } from '../../../core/utils/api-error';
import { initials, timeAgo } from '../../../core/utils/format';
import { PageHeader } from '../../../shared/components/page-header';
import { EmptyState, ErrorState } from '../../../shared/components/empty-state';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, FormsModule, TableModule, Button, Select, InputText, IconField, InputIcon, Tooltip, Skeleton, Tag, Avatar, Menu, PageHeader, EmptyState, ErrorState],
  template: `
    <app-page-header title="Users" [subtitle]="auth.isSuperAdmin() ? 'Students register themselves. Make office staff Staff so they can process claims, or deactivate an account. Deactivation signs the person out everywhere.' : 'Students register themselves. You can deactivate or reactivate student accounts; staff accounts and roles are managed by the super admin.'" />
    <section class="cf-card p-4 mb-4 flex flex-wrap gap-3" aria-label="Filters">
      <p-iconfield class="flex-1 min-w-[220px]"><p-inputicon styleClass="pi pi-search" /><input pInputText [(ngModel)]="q" (ngModelChange)="search$.next()" placeholder="Search name, email, student ID" aria-label="Search users" class="w-full" /></p-iconfield>
      <p-select [(ngModel)]="role" [options]="roleOptions" optionLabel="label" optionValue="value" placeholder="Any role" [showClear]="true" (onChange)="reload()" ariaLabel="Role" />
      <p-select [(ngModel)]="status" [options]="statusOptions" optionLabel="label" optionValue="value" placeholder="Any status" [showClear]="true" (onChange)="reload()" ariaLabel="Status" />
    </section>
    @if (error()) {
      <div class="cf-card"><app-error-state [message]="error()!"><p-button label="Try again" icon="pi pi-refresh" (onClick)="fetch()" /></app-error-state></div>
    } @else {
      <div class="cf-card cf-table-wrap">
        <p-table [value]="rows()" [lazy]="true" (onLazyLoad)="onLazy($event)" [paginator]="true" [rows]="limit" [totalRecords]="total()" [loading]="loading()" [showLoader]="false" [rowHover]="true" responsiveLayout="stack" [breakpoint]="'900px'">
          <ng-template #header><tr><th>Person</th><th>Student ID</th><th>Department</th><th>Activity</th><th>Role</th><th>Status</th><th class="text-right">Actions</th></tr></ng-template>
          <ng-template #body let-u>
            <tr>
              <td><div class="flex items-center gap-3"><p-avatar [label]="initials(u.fullName)" shape="circle" [style]="{ background: 'var(--cf-ink)', color: 'var(--cf-tag)' }" /><div class="min-w-0"><p class="m-0 font-semibold">{{ u.fullName }} @if (u.id === me()) { <span class="text-xs cf-muted">(you)</span> }</p><p class="m-0 text-xs cf-muted truncate">{{ u.email }}</p></div></div></td>
              <td class="text-sm tabular-nums">{{ u.studentId }}</td>
              <td class="text-sm">{{ u.department }}</td>
              <td class="text-xs cf-muted">{{ u.reportCount }} reports · {{ u.claimCount }} claims<br />@if (u.lastLoginAt) { last seen {{ timeAgo(u.lastLoginAt) }} } @else { joined {{ u.createdAt | date: 'd MMM y' }} }</td>
              <td><p-tag [value]="roleTag(u).label" [icon]="roleTag(u).icon" [severity]="roleTag(u).severity" [rounded]="true" /></td>
              <td><p-tag [value]="u.status === 'active' ? 'Active' : 'Inactive'" [severity]="u.status === 'active' ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td class="text-right whitespace-nowrap">
                @if (u.id !== me()) {
                  @if (auth.isSuperAdmin()) {
                    <p-button icon="pi pi-id-card" [text]="true" [rounded]="true" severity="secondary" pTooltip="Change role" (onClick)="openRoleMenu($event, u)" [ariaLabel]="'Change role: ' + u.fullName" />
                  }
                  @if (auth.isSuperAdmin() || u.role === 'student') {
                  <p-button [icon]="u.status === 'active' ? 'pi pi-ban' : 'pi pi-check-circle'" [text]="true" [rounded]="true" [severity]="u.status === 'active' ? 'danger' : 'success'" [pTooltip]="u.status === 'active' ? 'Deactivate' : 'Reactivate'" (onClick)="toggleStatus(u)" [ariaLabel]="(u.status === 'active' ? 'Deactivate ' : 'Reactivate ') + u.fullName" />
                  }
                }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="7">
            @if (loading()) { <div class="flex flex-col gap-2">@for (s of [1,2,3,4]; track s) { <p-skeleton height="2.75rem" /> }</div> } @else { <app-empty-state title="No users match" /> }
          </td></tr></ng-template>
        </p-table>
      </div>
      <p-menu #roleMenu [model]="roleItems" [popup]="true" appendTo="body" />
    }
  `,
})
export class AdminUsersPage {
  private svc = inject(UsersService);
  auth = inject(AuthService);
  readonly roleLabel = ROLE_LABEL;
  readonly roleIcon = ROLE_ICON;
  readonly roleSeverity = ROLE_SEVERITY;
  roleMenu = viewChild<Menu>('roleMenu');
  roleTag(u: User) { return { label: ROLE_LABEL[u.role], icon: ROLE_ICON[u.role], severity: ROLE_SEVERITY[u.role] }; }
  roleItems: MenuItem[] = [];
  private notify = inject(NotifyService);
  private confirm = inject(ConfirmationService);
  rows = signal<User[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  page = 1;
  limit = 10;
  q = '';
  role: string | null = null;
  status: string | null = null;
  roleOptions = [{ label: 'Students', value: 'student' }, { label: 'Staff', value: 'admin' }, { label: 'Super admins', value: 'super_admin' }];
  statusOptions = [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }];
  search$ = new Subject<void>();
  initials = initials;
  timeAgo = timeAgo;
  me = () => this.auth.user()?.id;

  constructor() { this.search$.pipe(debounceTime(350), takeUntilDestroyed()).subscribe(() => this.reload()); }
  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list({ q: this.q.trim(), role: this.role, status: this.status, page: this.page, limit: this.limit }).subscribe({
      next: (r) => { this.rows.set(r.data); this.total.set(r.total); this.loading.set(false); },
      error: (err) => { this.error.set(errorMessage(err, 'Users could not load.')); this.loading.set(false); },
    });
  }
  onLazy(e: TableLazyLoadEvent) { this.limit = e.rows ?? 10; this.page = Math.floor((e.first ?? 0) / this.limit) + 1; this.fetch(); }
  reload() { this.page = 1; this.fetch(); }
  private change(u: User, body: Record<string, string>, header: string, message: string, done: string) {
    this.confirm.confirm({
      header, message, icon: 'pi pi-exclamation-triangle', acceptLabel: header.replace('?', ''), rejectLabel: 'Cancel', rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.svc.update(u.id, body).subscribe({ next: () => { this.notify.success(done, u.fullName); this.fetch(); }, error: (err) => this.notify.error('Could not update', errorMessage(err)) }),
    });
  }
  private readonly ROLE_EFFECT: Record<Role, string> = {
    student: 'will only be able to report items and make claims.',
    admin: 'will be able to pick up and process claims, manage items and deactivate students.',
    super_admin: 'will have full control, including staff accounts and roles.',
  };
  openRoleMenu(e: Event, u: User) {
    this.roleItems = (['student', 'admin', 'super_admin'] as Role[]).map((r) => ({
      label: ROLE_LABEL[r], icon: ROLE_ICON[r], disabled: r === u.role,
      command: () => this.change(u, { role: r }, `Make ${ROLE_LABEL[r].toLowerCase()}?`, `${u.fullName} ${this.ROLE_EFFECT[r]}`, `Role changed to ${ROLE_LABEL[r].toLowerCase()}`),
    }));
    this.roleMenu()?.toggle(e);
  }
  toggleStatus(u: User) {
    const off = u.status === 'active';
    this.change(u, { status: off ? 'inactive' : 'active' }, off ? 'Deactivate account?' : 'Reactivate account?', off ? `${u.fullName} will be signed out and can't sign in until reactivated.` : `${u.fullName} will be able to sign in again.`, off ? 'Account deactivated' : 'Account reactivated');
  }
}
