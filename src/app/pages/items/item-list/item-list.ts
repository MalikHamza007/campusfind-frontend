import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { Button, ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Tooltip } from 'primeng/tooltip';
import { Skeleton } from 'primeng/skeleton';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ItemsService } from '../../../core/services/data.services';
import { AuthService } from '../../../core/services/auth.service';
import { Item } from '../../../core/interfaces/models';
import { CATEGORY_OPTIONS, ITEM_STATUS_OPTIONS, LOCATIONS } from '../../../core/constants/labels';
import { errorMessage } from '../../../core/utils/api-error';
import { toIsoDate } from '../../../core/utils/format';
import { PageHeader } from '../../../shared/components/page-header';
import { CodeTag, ItemStatusTag, TypePill, CategoryLabel } from '../../../shared/components/tags';
import { EmptyState, ErrorState } from '../../../shared/components/empty-state';
import { SecureImage } from '../../../shared/components/secure-image';
import { ItemsMap, MapPin } from '../../../shared/components/items-map';

@Component({
  selector: 'app-item-list',
  imports: [FormsModule, DatePipe, RouterLink, TableModule, Button, ButtonDirective, Select, SelectButton, DatePicker, InputText, IconField, InputIcon, Tooltip, Skeleton, PageHeader, CodeTag, ItemStatusTag, TypePill, CategoryLabel, EmptyState, ErrorState, SecureImage, ItemsMap],
  templateUrl: './item-list.html',
})
export class ItemListPage implements OnInit {
  // query params (component input binding)
  q = input<string>();
  type = input<string>();
  category = input<string>();
  status = input<string>();
  location = input<string>();

  auth = inject(AuthService);
  private svc = inject(ItemsService);
  private router = inject(Router);

  filters = { q: '', type: null as string | null, category: null as string | null, status: null as string | null, location: null as string | null, range: null as Date[] | null, sort: 'newest' };
  rows = signal<Item[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  page = 1;
  limit = 10;
  first = 0;
  view = signal<'table' | 'map'>('table');
  pins = signal<MapPin[]>([]);
  maxDate = new Date();

  typeOptions = [{ label: 'All', value: null }, { label: 'Lost', value: 'lost' }, { label: 'Found', value: 'found' }];
  viewOptions = [{ icon: 'pi pi-list', value: 'table', label: 'List' }, { icon: 'pi pi-map', value: 'map', label: 'Map' }];
  categoryOptions = CATEGORY_OPTIONS;
  statusOptions = ITEM_STATUS_OPTIONS;
  locationOptions = LOCATIONS.map((l) => ({ label: l, value: l }));
  sortOptions = [
    { label: 'Newest reports', value: 'newest' }, { label: 'Oldest reports', value: 'oldest' },
    { label: 'Event date (recent)', value: '-eventDate' }, { label: 'Title A–Z', value: 'title' },
  ];
  private search$ = new Subject<void>();

  constructor() {
    this.search$.pipe(debounceTime(350), takeUntilDestroyed()).subscribe(() => this.reload());
  }

  ngOnInit() {
    this.filters.q = this.q() ?? '';
    this.filters.type = this.type() ?? null;
    this.filters.category = this.category() ?? null;
    this.filters.status = this.status() ?? null;
    this.filters.location = this.location() ?? null;
    this.fetch();
  }

  private params() {
    return {
      q: this.filters.q.trim(), type: this.filters.type, category: this.filters.category, status: this.filters.status, location: this.filters.location,
      dateFrom: toIsoDate(this.filters.range?.[0]), dateTo: toIsoDate(this.filters.range?.[1] ?? this.filters.range?.[0]), sort: this.filters.sort,
    };
  }

  fetch() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list({ ...this.params(), page: this.page, limit: this.limit }).subscribe({
      next: (r) => {
        this.rows.set(r.data);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'The directory could not load.'));
        this.loading.set(false);
      },
    });
    if (this.view() === 'map') this.fetchPins();
  }

  fetchPins() {
    this.svc.list({ ...this.params(), page: 1, limit: 100 }).subscribe({
      next: (r) => this.pins.set(r.data.map((i) => ({ id: i.id, lat: i.coordinates.lat, lng: i.coordinates.lng, type: i.reportType, title: i.title, code: i.code, location: i.locationName }))),
      error: () => this.pins.set([]),
    });
  }

  onLazy(e: TableLazyLoadEvent) {
    this.limit = e.rows ?? 10;
    this.first = e.first ?? 0;
    this.page = Math.floor(this.first / this.limit) + 1;
    this.fetch();
  }

  reload() {
    this.page = 1;
    this.first = 0;
    this.syncUrl();
    this.fetch();
  }
  typed() {
    this.search$.next();
  }
  clear() {
    this.filters = { q: '', type: null, category: null, status: null, location: null, range: null, sort: 'newest' };
    this.reload();
  }
  hasFilters() {
    const f = this.filters;
    return !!(f.q || f.type || f.category || f.status || f.location || f.range);
  }
  setView(v: 'table' | 'map') {
    this.view.set(v);
    if (v === 'map') this.fetchPins();
  }
  private syncUrl() {
    const f = this.filters;
    void this.router.navigate([], { queryParams: { q: f.q || null, type: f.type, category: f.category, status: f.status, location: f.location }, replaceUrl: true });
  }
  open(id: string) {
    void this.router.navigate(['/items', id]);
  }
  canClaim(i: Item) {
    return this.auth.can('claims.create') && i.reportType === 'found' && !i.isMine && ['open', 'claim_pending'].includes(i.status);
  }
  canEdit(i: Item) {
    return (i.isMine || this.auth.isAdmin()) && i.status !== 'returned';
  }
}
