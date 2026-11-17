import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { UIChart } from 'primeng/chart';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { SelectButton } from 'primeng/selectbutton';
import { Button, ButtonDirective } from 'primeng/button';
import { Skeleton } from 'primeng/skeleton';
import { Tooltip } from 'primeng/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { DashboardService, ItemsService } from '../../core/services/data.services';
import { AdminStats, Item, StudentStats, Category, ItemStatus } from '../../core/interfaces/models';
import { ACTION_LABELS, CATEGORY_LABELS, CATEGORY_OPTIONS, ITEM_STATUS_LABELS, ITEM_STATUS_OPTIONS, LOCATIONS } from '../../core/constants/labels';
import { chartBase, periodLabel, SERIES, STATUS_COLORS } from '../../core/utils/chart-theme';
import { formatBytes, timeAgo, toIsoDate } from '../../core/utils/format';
import { errorMessage } from '../../core/utils/api-error';
import { KpiCard } from '../../shared/components/kpi-card';
import { ChartCard, ChartTable } from '../../shared/components/chart-card';
import { ItemsMap, MapPin } from '../../shared/components/items-map';
import { CodeTag, ItemStatusTag, ClaimStatusTag, TypePill } from '../../shared/components/tags';
import { ErrorState, EmptyState } from '../../shared/components/empty-state';
import { SecureImage } from '../../shared/components/secure-image';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, DatePipe, RouterLink, UIChart, Select, DatePicker, SelectButton, Button, ButtonDirective, Skeleton, Tooltip, KpiCard, ChartCard, ItemsMap, CodeTag, ItemStatusTag, ClaimStatusTag, TypePill, ErrorState, EmptyState, SecureImage],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardPage {
  auth = inject(AuthService);
  private theme = inject(ThemeService);
  private svc = inject(DashboardService);
  private items = inject(ItemsService);
  private router = inject(Router);

  // filters
  range: Date[] | null = null;
  category: Category | null = null;
  location: string | null = null;
  department: string | null = null;
  reportType: 'lost' | 'found' | null = null;
  status: ItemStatus | null = null;
  granularity = signal<'day' | 'week'>('week');
  categoryOptions = CATEGORY_OPTIONS;
  statusOptions = ITEM_STATUS_OPTIONS;
  locationOptions = LOCATIONS.map((l) => ({ label: l, value: l }));
  departmentOptions = signal<{ label: string; value: string }[]>([]);
  granularityOptions = [{ label: 'Weekly', value: 'week' }, { label: 'Daily', value: 'day' }];
  typeOptions = [{ label: 'Lost', value: 'lost' }, { label: 'Found', value: 'found' }];

  loading = signal(true);
  error = signal<string | null>(null);
  admin = signal<AdminStats | null>(null);
  student = signal<StudentStats | null>(null);
  pins = signal<MapPin[]>([]);
  now = new Date();
  maxDate = new Date();

  greeting = computed(() => {
    const h = new Date().getHours();
    const first = this.auth.user()?.fullName.split(' ')[0] ?? '';
    return `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${first}`;
  });

  constructor() {
    this.load();
    this.loadPins();
    if (this.auth.isAdmin()) this.items.departments().subscribe({ next: (d) => this.departmentOptions.set(d.map((x) => ({ label: x, value: x }))), error: () => undefined });
    // repaint charts when the theme changes
    effect(() => {
      this.theme.dark();
      this.paletteTick.update((n) => n + 1);
    });
  }
  private paletteTick = signal(0);

  params() {
    return {
      dateFrom: toIsoDate(this.range?.[0]),
      dateTo: toIsoDate(this.range?.[1] ?? this.range?.[0]),
      category: this.category,
      location: this.location,
      department: this.auth.isAdmin() ? this.department : undefined,
      reportType: !this.auth.isAdmin() ? this.reportType : undefined,
      granularity: this.granularity(),
    };
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.stats(this.params()).subscribe({
      next: (s) => {
        if (s.role === 'admin') this.admin.set(s);
        else this.student.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'Dashboard data could not load.'));
        this.loading.set(false);
      },
    });
  }

  loadPins() {
    this.items.list({ status: 'open', limit: 100, category: this.category, location: this.location }).subscribe({
      next: (r) => this.pins.set(r.data.map((i: Item) => ({ id: i.id, lat: i.coordinates.lat, lng: i.coordinates.lng, type: i.reportType, title: i.title, code: i.code, location: i.locationName }))),
      error: () => this.pins.set([]),
    });
  }

  applyFilters() {
    this.load();
    this.loadPins();
  }
  resetFilters() {
    this.range = null;
    this.category = null;
    this.location = null;
    this.department = null;
    this.reportType = null;
    this.status = null;
    this.applyFilters();
  }
  setGranularity(g: 'day' | 'week') {
    this.granularity.set(g);
    this.load();
  }
  hasFilters() {
    return !!(this.range || this.category || this.location || this.department || this.reportType);
  }

  // ---------- chart builders ----------
  private mode = computed(() => (this.paletteTick(), this.theme.dark() ? 'dark' : 'light') as 'light' | 'dark');
  private base = computed(() => chartBase(this.mode() === 'dark'));

  private go(query: Record<string, string>) {
    void this.router.navigate(['/items'], { queryParams: query });
  }

  barOptions = computed(() => {
    const b = this.base();
    return {
      ...b.options,
      onClick: (_e: unknown, els: { index: number }[]) => {
        const s = this.admin();
        const list = s ? s.charts.lostVsFoundByCategory : this.student()?.charts.campusOpenByCategory;
        const hit = els[0] && list?.[els[0].index];
        if (hit) this.go({ category: hit.category, ...(s ? {} : { status: 'open' }) });
      },
      onHover: (e: { native?: { target?: HTMLElement } }, els: unknown[]) => { if (e.native?.target) e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
    };
  });
  hbarOptions = computed(() => {
    const b = this.base();
    return {
      ...b.options,
      indexAxis: 'y' as const,
      plugins: { ...b.options.plugins, legend: { display: false } },
      scales: { x: { ...b.options.scales.y }, y: { ...b.options.scales.x } },
      onClick: (_e: unknown, els: { index: number }[]) => {
        const list = this.admin()?.charts.byLocation ?? this.student()?.charts.campusByLocation;
        const hit = els[0] && list?.[els[0].index];
        if (hit) this.go({ location: hit.location });
      },
      onHover: (e: { native?: { target?: HTMLElement } }, els: unknown[]) => { if (e.native?.target) e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
    };
  });
  lineOptions = computed(() => {
    const b = this.base();
    return { ...b.options, interaction: { mode: 'index' as const, intersect: false }, plugins: { ...b.options.plugins, tooltip: { ...b.options.plugins.tooltip, mode: 'index' as const, intersect: false } } };
  });
  doughnutOptions = computed(() => {
    const b = this.base();
    return {
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { ...b.options.plugins.legend, position: 'right' as const }, tooltip: b.options.plugins.tooltip },
      onClick: (_e: unknown, els: { index: number }[]) => {
        const a = this.admin();
        if (a) {
          const hit = els[0] && a.charts.byStatus[els[0].index];
          if (hit) this.go({ status: hit.status });
        } else {
          const hit = els[0] && this.student()?.charts.myReportsByType[els[0].index];
          if (hit) void this.router.navigate(['/my-reports'], { queryParams: { type: hit.type } });
        }
      },
    };
  });

  private bar(color: string) {
    return { backgroundColor: color, borderRadius: 4, borderSkipped: 'start' as const, maxBarThickness: 22, borderWidth: 0 };
  }
  private line(color: string) {
    return { borderColor: color, backgroundColor: color + '22', borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: color, tension: 0.3, cubicInterpolationMode: 'monotone' as const, fill: true };
  }

  // admin
  catChart = computed(() => {
    const s = this.admin();
    const c = SERIES[this.mode()];
    if (!s) return null;
    return {
      labels: s.charts.lostVsFoundByCategory.map((r) => CATEGORY_LABELS[r.category]),
      datasets: [
        { label: 'Lost', data: s.charts.lostVsFoundByCategory.map((r) => r.lost), ...this.bar(c.lost) },
        { label: 'Found', data: s.charts.lostVsFoundByCategory.map((r) => r.found), ...this.bar(c.found) },
      ],
    };
  });
  catTable = computed<ChartTable | null>(() => {
    const s = this.admin();
    return s ? { columns: ['Category', 'Lost', 'Found'], rows: s.charts.lostVsFoundByCategory.map((r) => [CATEGORY_LABELS[r.category], r.lost, r.found]) } : null;
  });
  trendChart = computed(() => {
    const s = this.admin();
    const c = SERIES[this.mode()];
    if (!s) return null;
    return {
      labels: s.charts.reportsAndReturns.map((r) => periodLabel(r.period, this.granularity())),
      datasets: [
        { label: 'Reports', data: s.charts.reportsAndReturns.map((r) => r.reports), ...this.line(c.reports) },
        { label: 'Returns', data: s.charts.reportsAndReturns.map((r) => r.returns), ...this.line(c.returns), fill: false },
      ],
    };
  });
  trendTable = computed<ChartTable | null>(() => {
    const s = this.admin();
    return s ? { columns: ['Period', 'Reports', 'Returns'], rows: s.charts.reportsAndReturns.map((r) => [periodLabel(r.period, this.granularity()), r.reports, r.returns]) } : null;
  });
  statusChart = computed(() => {
    const s = this.admin();
    if (!s) return null;
    const pal = STATUS_COLORS[this.mode()];
    return {
      labels: s.charts.byStatus.map((r) => `${ITEM_STATUS_LABELS[r.status]} (${r.count})`),
      datasets: [{ data: s.charts.byStatus.map((r) => r.count), backgroundColor: s.charts.byStatus.map((r) => pal[r.status]), borderColor: this.base().surface, borderWidth: 2, hoverOffset: 6 }],
    };
  });
  statusTable = computed<ChartTable | null>(() => {
    const s = this.admin();
    return s ? { columns: ['Status', 'Items'], rows: s.charts.byStatus.map((r) => [ITEM_STATUS_LABELS[r.status], r.count]) } : null;
  });
  locationChart = computed(() => {
    const list = this.admin()?.charts.byLocation ?? this.student()?.charts.campusByLocation;
    if (!list) return null;
    return { labels: list.map((r) => r.location), datasets: [{ label: 'Reports', data: list.map((r) => r.count), ...this.bar(SERIES[this.mode()].found) }] };
  });
  locationTable = computed<ChartTable | null>(() => {
    const list = this.admin()?.charts.byLocation ?? this.student()?.charts.campusByLocation;
    return list ? { columns: ['Location', 'Reports'], rows: list.map((r) => [r.location, r.count]) } : null;
  });
  funnel = computed(() => {
    const f = this.admin()?.charts.funnel ?? [];
    const top = Math.max(1, f[0]?.count ?? 1);
    return f.map((s, i) => ({ ...s, pct: Math.round((s.count / top) * 100), conv: i ? Math.round((s.count / Math.max(1, f[i - 1].count)) * 100) : null }));
  });

  // student
  myTypeChart = computed(() => {
    const s = this.student();
    const c = SERIES[this.mode()];
    if (!s) return null;
    return {
      labels: s.charts.myReportsByType.map((r) => `${r.type === 'lost' ? 'Lost' : 'Found'} (${r.count})`),
      datasets: [{ data: s.charts.myReportsByType.map((r) => r.count), backgroundColor: [c.lost, c.found], borderColor: this.base().surface, borderWidth: 2 }],
    };
  });
  myTypeTotal = computed(() => this.student()?.charts.myReportsByType.reduce((a, b) => a + b.count, 0) ?? 0);
  openCatChart = computed(() => {
    const s = this.student();
    if (!s) return null;
    return { labels: s.charts.campusOpenByCategory.map((r) => CATEGORY_LABELS[r.category]), datasets: [{ label: 'Open items', data: s.charts.campusOpenByCategory.map((r) => r.count), ...this.bar(SERIES[this.mode()].found) }] };
  });
  openCatTable = computed<ChartTable | null>(() => {
    const s = this.student();
    return s ? { columns: ['Category', 'Open items'], rows: s.charts.campusOpenByCategory.map((r) => [CATEGORY_LABELS[r.category], r.count]) } : null;
  });
  myTimelineChart = computed(() => {
    const s = this.student();
    if (!s) return null;
    return { labels: s.charts.myReportsTimeline.map((r) => periodLabel(r.period, this.granularity())), datasets: [{ label: 'My reports', data: s.charts.myReportsTimeline.map((r) => r.count), ...this.line(SERIES[this.mode()].reports) }] };
  });
  myTimelineTable = computed<ChartTable | null>(() => {
    const s = this.student();
    return s ? { columns: ['Period', 'Reports'], rows: s.charts.myReportsTimeline.map((r) => [periodLabel(r.period, this.granularity()), r.count]) } : null;
  });

  // helpers for templates
  timeAgo = timeAgo;
  formatBytes = formatBytes;
  actionLabel(a: string) {
    return ACTION_LABELS[a] ?? a.replace(/[._]/g, ' ');
  }
  activityIcon(a: string) {
    if (a.startsWith('item.lost')) return 'pi pi-exclamation-circle';
    if (a.startsWith('item.found')) return 'pi pi-inbox';
    if (a.includes('approved') || a.includes('returned')) return 'pi pi-check-circle';
    if (a.includes('rejected')) return 'pi pi-times-circle';
    if (a.startsWith('claim')) return 'pi pi-verified';
    if (a.startsWith('file')) return 'pi pi-paperclip';
    if (a.startsWith('auth')) return 'pi pi-sign-in';
    return 'pi pi-user-edit';
  }
  openItem(id: string) {
    void this.router.navigate(['/items', id]);
  }
}
