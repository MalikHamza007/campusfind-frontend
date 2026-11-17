import { Component, inject, signal } from '@angular/core';
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
  imports: [DatePipe, FormsModule, TableModule, Button, Select, InputText, IconField, InputIcon, Tooltip, Skeleton, Tag, Avatar, PageHeader, EmptyState, ErrorState],
  template: `
    <app-page-header title="Users" subtitle="Students register themselves. Promote trusted staff to administrator, or deactivate an account — deactivation signs the person out everywhere." />
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
              <td><p-tag [value]="u.role === 'admin' ? 'Administrator' : 'Student'" [severity]="u.role === 'admin' ? 'contrast' : 'info'" [rounded]="true" /></td>
              <td><p-tag [value]="u.status === 'active' ? 'Active' : 'Inactive'" [severity]="u.status === 'active' ? 'success' : 'secondary'" [rounded]="true" /></td>
              <td class="text-right whitespace-nowrap">
                @if (u.id !== me()) {
                  <p-button [icon]="u.role === 'admin' ? 'pi pi-user-minus' : 'pi pi-shield'" [text]="true" [rounded]="true" severity="secondary" [pTooltip]="u.role === 'admin' ? 'Make student' : 'Make administrator'" (onClick)="toggleRole(u)" [ariaLabel]="(u.role === 'admin' ? 'Make student: ' : 'Make administrator: ') + u.fullName" />
                  <p-button [icon]="u.status === 'active' ? 'pi pi-ban' : 'pi pi-check-circle'" [text]="true" [rounded]="true" [severity]="u.status === 'active' ? 'danger' : 'success'" [pTooltip]="u.status === 'active' ? 'Deactivate' : 'Reactivate'" (onClick)="toggleStatus(u)" [ariaLabel]="(u.status === 'active' ? 'Deactivate ' : 'Reactivate ') + u.fullName" />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage><tr><td colspan="7">
            @if (loading()) { <div class="flex flex-col gap-2">@for (s of [1,2,3,4]; track s) { <p-skeleton height="2.75rem" /> }</div> } @else { <app-empty-state title="No users match" /> }
          </td></tr></ng-template>
        </p-table>
      </div>
    }
  `,
})
export class AdminUsersPage {
  private svc = inject(UsersService);
  private auth = inject(AuthService);
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
  roleOptions = [{ label: 'Students', value: 'student' }, { label: 'Administrators', value: 'admin' }];
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
  toggleRole(u: User) {
    const toAdmin = u.role !== 'admin';
    this.change(u, { role: toAdmin ? 'admin' : 'student' }, toAdmin ? 'Make administrator?' : 'Make student?', toAdmin ? `${u.fullName} will be able to review claims, manage items and users.` : `${u.fullName} will lose administrator access.`, toAdmin ? 'Promoted to administrator' : 'Changed to student');
  }
  toggleStatus(u: User) {
    const off = u.status === 'active';
    this.change(u, { status: off ? 'inactive' : 'active' }, off ? 'Deactivate account?' : 'Reactivate account?', off ? `${u.fullName} will be signed out and can't sign in until reactivated.` : `${u.fullName} will be able to sign in again.`, off ? 'Account deactivated' : 'Account reactivated');
  }
}
