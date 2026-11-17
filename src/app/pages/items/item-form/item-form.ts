import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button, ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';
import { ItemsService } from '../../../core/services/data.services';
import { AuthService } from '../../../core/services/auth.service';
import { NotifyService } from '../../../core/services/notify.service';
import { Item, ReportType } from '../../../core/interfaces/models';
import { CATEGORY_OPTIONS } from '../../../core/constants/labels';
import { applyServerErrors, errorCode, errorMessage } from '../../../core/utils/api-error';
import { PageHeader } from '../../../shared/components/page-header';
import { MapPicker, PickedLocation } from '../../../shared/components/map-picker';
import { AttachedFile, FileAttacher } from '../../../shared/components/image-uploader';
import { ErrorState } from '../../../shared/components/empty-state';
import { CodeTag } from '../../../shared/components/tags';

const notFuture = (c: AbstractControl): ValidationErrors | null => (c.value && new Date(c.value).getTime() > Date.now() ? { future: true } : null);
const notTooOld = (c: AbstractControl): ValidationErrors | null => (c.value && new Date(c.value).getTime() < Date.now() - 365 * 864e5 ? { tooOld: true } : null);

@Component({
  selector: 'app-item-form',
  imports: [ReactiveFormsModule, RouterLink, Button, ButtonDirective, InputText, Textarea, Select, DatePicker, Message, Skeleton, PageHeader, MapPicker, FileAttacher, ErrorState, CodeTag],
  templateUrl: './item-form.html',
})
export class ItemFormPage implements OnInit {
  type = input<string>();
  id = input<string>();
  private fb = inject(FormBuilder);
  private svc = inject(ItemsService);
  private router = inject(Router);
  private notify = inject(NotifyService);
  auth = inject(AuthService);

  editing = computed(() => !!this.id());
  reportType = signal<ReportType>('lost');
  report = signal<Item | null>(null);
  loading = signal(false);
  loadError = signal<string | null>(null);
  saving = signal(false);
  uploading = signal(false);
  formError = signal<string | null>(null);
  images = signal<AttachedFile[]>([]);
  location = signal<PickedLocation | null>(null);
  categories = CATEGORY_OPTIONS;
  maxDate = new Date();
  minDate = new Date(Date.now() - 365 * 864e5);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    category: [null as string | null, Validators.required],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    eventDate: [new Date() as Date | null, [Validators.required, notFuture, notTooOld]],
    locationName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    lat: [null as number | null, Validators.required],
    lng: [null as number | null, Validators.required],
    distinctiveFeatures: ['', Validators.maxLength(500)],
    color: ['', Validators.maxLength(40)],
    brand: ['', Validators.maxLength(60)],
  });

  ngOnInit() {
    if (this.id()) this.load();
    else this.reportType.set(this.type() === 'found' ? 'found' : 'lost');
  }

  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.svc.get(this.id()!).subscribe({
      next: (i) => {
        if (!i.isMine && !this.auth.isAdmin()) {
          void this.router.navigate(['/forbidden']);
          return;
        }
        this.report.set(i);
        this.reportType.set(i.reportType);
        this.form.patchValue({
          title: i.title, category: i.category, description: i.description, eventDate: new Date(i.eventDate), locationName: i.locationName,
          lat: i.coordinates.lat, lng: i.coordinates.lng, distinctiveFeatures: i.distinctiveFeatures ?? '', color: i.color ?? '', brand: i.brand ?? '',
        });
        this.location.set({ locationName: i.locationName, lat: i.coordinates.lat, lng: i.coordinates.lng, insideCampus: true });
        this.images.set(i.images.map((im) => ({ id: im.id, originalName: 'Photo', mimeType: 'image/jpeg', size: 0, url: im.url })));
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(errorMessage(err, 'This report could not load.'));
        this.loading.set(false);
      },
    });
  }

  onLocation(p: PickedLocation) {
    this.form.patchValue({ locationName: p.locationName, lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) });
    this.form.controls.locationName.markAsTouched();
    this.location.set(p);
  }

  show(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }
  missingDetail() {
    const v = this.form.value;
    return this.reportType() === 'found' && !(v.distinctiveFeatures?.trim() || v.color?.trim() || v.brand?.trim());
  }

  submit() {
    this.formError.set(null);
    if (this.form.invalid || this.missingDetail() || this.location()?.insideCampus === false) {
      this.form.markAllAsTouched();
      this.formError.set(
        this.location()?.insideCampus === false ? 'Pick a location inside the campus boundary.' : this.missingDetail() ? 'Add at least one distinguishing detail: features, color or brand.' : 'Some fields need attention.',
      );
      return;
    }
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      title: v.title, category: v.category, description: v.description, eventDate: v.eventDate?.toISOString(), locationName: v.locationName,
      coordinates: { lat: v.lat, lng: v.lng }, distinctiveFeatures: v.distinctiveFeatures ?? '', color: v.color ?? '', brand: v.brand ?? '',
      imageFileIds: this.images().map((f) => f.id),
    };
    this.saving.set(true);
    const req = this.editing() ? this.svc.update(this.id()!, { ...body, version: this.report()!.version }) : this.svc.create({ ...body, reportType: this.reportType() });
    req.subscribe({
      next: (item) => {
        this.notify.success(this.editing() ? 'Report updated' : this.reportType() === 'lost' ? 'Lost item reported' : 'Found item reported', `${item.code} · ${item.title}`);
        void this.router.navigate(['/items', item.id]);
      },
      error: (err) => {
        this.saving.set(false);
        applyServerErrors(this.form, err);
        this.formError.set(errorCode(err) === 'STALE_VERSION' ? 'Someone else changed this report while you were editing. Reload the page to get the latest version.' : errorMessage(err));
      },
    });
  }
}
