import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Timeline } from 'primeng/timeline';
import { Claim } from '../../core/interfaces/models';

/** Status timeline for a claim: submitted → reviewed → handed over (or withdrawn/rejected). */
@Component({
  selector: 'app-claim-timeline',
  imports: [Timeline, DatePipe],
  template: `
    <p-timeline [value]="events()" align="left" styleClass="text-sm">
      <ng-template #marker let-e><span class="w-6 h-6 rounded-full grid place-items-center text-[11px]" [style.background]="e.done ? e.color : 'var(--cf-surface-2)'" [style.color]="e.done ? '#fff' : 'var(--cf-muted)'"><i [class]="e.icon"></i></span></ng-template>
      <ng-template #content let-e>
        <p class="m-0 font-semibold" [class.cf-muted]="!e.done">{{ e.label }}</p>
        @if (e.date) { <p class="m-0 text-xs cf-muted">{{ e.date | date: 'd MMM y, HH:mm' }}</p> }
        @if (e.note) { <p class="m-0 mt-1 text-xs">“{{ e.note }}”</p> }
      </ng-template>
    </p-timeline>
  `,
})
export class ClaimTimeline {
  claim = input.required<Claim>();
  events = computed(() => {
    const c = this.claim();
    const ev: { label: string; date?: string | null; icon: string; color: string; done: boolean; note?: string | null }[] = [
      { label: 'Claim submitted', date: c.createdAt, icon: 'pi pi-send', color: '#3b6fd4', done: true },
    ];
    if (c.status === 'withdrawn') ev.push({ label: 'You withdrew this claim', date: c.withdrawnAt, icon: 'pi pi-undo', color: '#6d7f89', done: true });
    else if (c.status === 'rejected') ev.push({ label: 'Not approved', date: c.reviewedAt, icon: 'pi pi-times', color: '#c8385a', done: true, note: c.adminNote });
    else {
      ev.push({ label: c.status === 'pending' ? 'Waiting for office review' : 'Ownership approved', date: c.reviewedAt, icon: 'pi pi-check', color: '#8a4fd0', done: c.status !== 'pending', note: c.status !== 'pending' ? c.adminNote : null });
      ev.push({ label: c.status === 'returned' ? 'Handed over to the owner' : 'Collected at the Lost & Found Office', date: c.returnedAt, icon: 'pi pi-box', color: '#1f9e89', done: c.status === 'returned' });
    }
    return ev;
  });
}
