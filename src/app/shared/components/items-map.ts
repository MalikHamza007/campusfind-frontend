import { AfterViewInit, Component, effect, ElementRef, inject, input, OnDestroy, output, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { MapService } from '../../core/services/data.services';

export interface MapPin { id: string; lat: number; lng: number; type: 'lost' | 'found'; title: string; code?: string; location?: string }

/** Read-only campus map (OpenStreetMap tiles via Leaflet) with lost/found pins. */
@Component({
  selector: 'app-items-map',
  template: `<div #host class="w-full h-full min-h-[220px]" role="region" [attr.aria-label]="ariaLabel()"></div>`,
  host: { class: 'block' },
})
export class ItemsMap implements AfterViewInit, OnDestroy {
  pins = input<MapPin[]>([]);
  zoom = input(16);
  interactive = input(true);
  ariaLabel = input('Campus map of reported items');
  pinClick = output<string>();
  private hostEl = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private mapService = inject(MapService);
  private map?: L.Map;
  private layer = L.layerGroup();

  constructor() {
    effect(() => {
      const p = this.pins();
      if (this.map) this.draw(p);
    });
  }

  ngAfterViewInit() {
    this.mapService.config().subscribe({
      next: (cfg) => this.init(cfg.center, cfg.bounds),
      error: () => this.init({ lat: 31.5203, lng: 74.352 }),
    });
  }

  private init(center: { lat: number; lng: number }, b?: { minLat: number; minLng: number; maxLat: number; maxLng: number }) {
    if (this.map) return;
    const i = this.interactive();
    this.map = L.map(this.hostEl().nativeElement, { center: [center.lat, center.lng], zoom: this.zoom(), scrollWheelZoom: false, dragging: i, zoomControl: i, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(this.map);
    if (b) L.rectangle([[b.minLat, b.minLng], [b.maxLat, b.maxLng]], { color: '#1f9e89', weight: 1, fill: false, dashArray: '4 6' }).addTo(this.map);
    this.layer.addTo(this.map);
    this.draw(this.pins());
    setTimeout(() => this.map?.invalidateSize(), 50);
  }

  private draw(pins: MapPin[]) {
    this.layer.clearLayers();
    for (const p of pins) {
      const m = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<div class="cf-pin ${p.type}"></div>`, iconSize: [18, 18], iconAnchor: [9, 18] }), title: p.title, keyboard: true });
      const safe = (s = '') => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
      m.bindTooltip(`<strong>${safe(p.title)}</strong><br>${safe(p.code)} · ${safe(p.location)}`, { direction: 'top', offset: [0, -14] });
      m.on('click', () => this.pinClick.emit(p.id));
      m.addTo(this.layer);
    }
    if (pins.length === 1) this.map?.setView([pins[0].lat, pins[0].lng], this.zoom());
  }

  ngOnDestroy() {
    this.map?.remove();
  }
}
