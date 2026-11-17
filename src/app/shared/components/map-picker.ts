import { AfterViewInit, Component, inject, input, OnDestroy, output, signal, ElementRef, viewChild, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { Message } from 'primeng/message';
import { MapService } from '../../core/services/data.services';
import { GeoPlace, MapConfig } from '../../core/interfaces/models';

export interface PickedLocation { locationName: string; lat: number; lng: number; insideCampus: boolean }

/**
 * Location picker: search campus landmarks + OpenStreetMap Nominatim (through our API proxy),
 * or click the map — a reverse lookup labels the spot. Works with landmarks only if the map service is down.
 */
@Component({
  selector: 'app-map-picker',
  imports: [FormsModule, AutoComplete, Message],
  template: `
    <div class="flex flex-col gap-3">
      <p-autocomplete [(ngModel)]="query" [suggestions]="suggestions()" (completeMethod)="search($event)" (onSelect)="choose($event)" optionLabel="displayName" [delay]="450" [minLength]="2"
        placeholder="Search a building or place, e.g. Main Library" [fluid]="true" inputId="location-search" ariaLabel="Search location" [showEmptyMessage]="true" [panelStyle]="{ maxWidth: 'min(560px, 92vw)' }" emptyMessage="No places found — click the map instead">
        <ng-template #item let-p>
          <div class="flex items-center gap-2 min-w-0">
            <i [class]="p.source === 'landmark' ? 'pi pi-building' : 'pi pi-map-marker'" class="text-xs cf-muted"></i>
            <span class="truncate">{{ p.displayName }}</span>
            @if (!p.insideCampus) { <span class="text-[10px] font-semibold px-1.5 rounded" style="background: var(--p-orange-100); color: var(--p-orange-700)">off campus</span> }
          </div>
        </ng-template>
      </p-autocomplete>
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Campus landmarks">
        @for (l of landmarks(); track l.name) {
          <button type="button" class="text-xs px-2.5 py-1 rounded-full border cursor-pointer" style="border-color: var(--cf-border); background: var(--cf-surface-2)" (click)="pickLandmark(l)">{{ l.name }}</button>
        }
      </div>
      <div #host class="w-full h-[280px] rounded-xl" style="border: 1px solid var(--cf-border)" role="application" aria-label="Map — click to set the location"></div>
      @if (warning()) { <p-message severity="warn" size="small" [text]="warning()!" /> }
      @if (picked(); as p) {
        <p class="m-0 text-xs cf-muted"><i class="pi pi-map-marker"></i> {{ p.locationName }} · {{ p.lat.toFixed(5) }}, {{ p.lng.toFixed(5) }} @if (busy()) { · looking up address… }</p>
      }
    </div>
  `,
})
export class MapPicker implements AfterViewInit, OnDestroy {
  initial = input<PickedLocation | null>(null);
  changed = output<PickedLocation>();
  private svc = inject(MapService);
  private hostEl = viewChild.required<ElementRef<HTMLDivElement>>('host');
  query: GeoPlace | string = '';
  suggestions = signal<GeoPlace[]>([]);
  landmarks = signal<MapConfig['landmarks']>([]);
  warning = signal<string | null>(null);
  picked = signal<PickedLocation | null>(null);
  busy = signal(false);
  private map?: L.Map;
  private marker?: L.Marker;
  private cfg?: MapConfig;

  constructor() {
    effect(() => {
      const i = this.initial();
      if (i && !this.picked()) {
        this.picked.set(i);
        this.placeMarker(i.lat, i.lng, false);
      }
    });
  }

  ngAfterViewInit() {
    this.svc.config().subscribe({
      next: (cfg) => {
        this.cfg = cfg;
        this.landmarks.set(cfg.landmarks);
        this.init(cfg);
      },
      error: () => this.warning.set('Map settings could not load. You can still type the location.'),
    });
  }

  private init(cfg: MapConfig) {
    const start = this.initial() ?? cfg.center;
    this.map = L.map(this.hostEl().nativeElement, { center: [start.lat, start.lng], zoom: 16, scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.map);
    const b = cfg.bounds;
    L.rectangle([[b.minLat, b.minLng], [b.maxLat, b.maxLng]], { color: '#1f9e89', weight: 1.5, fillOpacity: 0.04, dashArray: '4 6' }).addTo(this.map);
    for (const l of cfg.landmarks) L.circleMarker([l.lat, l.lng], { radius: 4, color: '#0f3d38', weight: 1, fillOpacity: 0.6 }).bindTooltip(l.name).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => this.reverse(e.latlng.lat, e.latlng.lng));
    const i = this.picked();
    if (i) this.placeMarker(i.lat, i.lng, false);
    setTimeout(() => this.map?.invalidateSize(), 60);
  }

  search(e: AutoCompleteCompleteEvent) {
    this.svc.search(e.query).subscribe({
      next: (r) => {
        this.suggestions.set(r.data);
        this.warning.set(r.warning ?? null);
      },
      error: () => {
        const q = e.query.toLowerCase();
        this.suggestions.set(this.landmarks().filter((l) => l.name.toLowerCase().includes(q)).map((l) => ({ ...l, displayName: l.name, insideCampus: true, source: 'landmark' as const })));
        this.warning.set('Map search is unavailable right now — showing campus landmarks only.');
      },
    });
  }

  choose(e: AutoCompleteSelectEvent) {
    const p = e.value as GeoPlace;
    this.set({ locationName: p.source === 'landmark' ? p.name : p.name || p.displayName.split(',')[0], lat: p.lat, lng: p.lng, insideCampus: p.insideCampus });
  }

  pickLandmark(l: { name: string; lat: number; lng: number }) {
    this.set({ locationName: l.name, lat: l.lat, lng: l.lng, insideCampus: true });
  }

  private reverse(lat: number, lng: number) {
    const inside = this.inside(lat, lng);
    this.set({ locationName: this.picked()?.locationName ?? 'Selected point', lat, lng, insideCampus: inside });
    this.busy.set(true);
    this.svc.reverse(lat, lng).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.warning.set(r.warning ?? null);
        this.set({ locationName: r.data.name, lat, lng, insideCampus: inside });
      },
      error: () => {
        this.busy.set(false);
        this.warning.set('Address lookup failed — type a location name in the field above the map.');
      },
    });
  }

  private set(p: PickedLocation) {
    this.picked.set(p);
    this.placeMarker(p.lat, p.lng, true);
    if (!p.insideCampus) this.warning.set('That point is outside the campus boundary. Reports must be on campus.');
    else if (this.warning()?.includes('outside')) this.warning.set(null);
    this.changed.emit(p);
  }

  private placeMarker(lat: number, lng: number, pan: boolean) {
    if (!this.map) return;
    const icon = L.divIcon({ className: '', html: '<div class="cf-pin pick"></div>', iconSize: [24, 24], iconAnchor: [12, 24] });
    if (this.marker) this.marker.setLatLng([lat, lng]);
    else this.marker = L.marker([lat, lng], { icon, title: 'Selected location' }).addTo(this.map);
    if (pan) this.map.panTo([lat, lng]);
  }

  private inside(lat: number, lng: number) {
    const b = this.cfg?.bounds;
    return !b || (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng);
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}
