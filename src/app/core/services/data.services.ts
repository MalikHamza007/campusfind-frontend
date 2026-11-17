import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { filter, map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AuditEntry, Claim, DashboardStats, FilePurpose, GeoPlace, GeoResult, Item, MapConfig, Paginated, SignedLink, StoredFile, User,
} from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private api = inject(ApiService);
  list(params: Record<string, unknown>) { return this.api.get<Paginated<Item>>('/items', params, true); }
  mine(params: Record<string, unknown>) { return this.api.get<Paginated<Item>>('/items/mine', params, true); }
  get(id: string) { return this.api.get<{ item: Item }>(`/items/${id}`, {}, true).pipe(map((r) => r.item)); }
  create(body: unknown) { return this.api.post<{ item: Item }>('/items', body, true).pipe(map((r) => r.item)); }
  update(id: string, body: unknown) { return this.api.patch<{ item: Item }>(`/items/${id}`, body, true).pipe(map((r) => r.item)); }
  remove(id: string) { return this.api.delete<{ ok: true }>(`/items/${id}`, true); }
  restore(id: string) { return this.api.post<{ item: Item }>(`/items/${id}/restore`, {}, true); }
  departments() { return this.api.get<{ data: string[] }>('/items/departments').pipe(map((r) => r.data)); }
}

@Injectable({ providedIn: 'root' })
export class ClaimsService {
  private api = inject(ApiService);
  list(params: Record<string, unknown>) { return this.api.get<Paginated<Claim>>('/claims', params, true); }
  get(id: string) { return this.api.get<{ claim: Claim }>(`/claims/${id}`, {}, true).pipe(map((r) => r.claim)); }
  create(body: unknown) { return this.api.post<{ claim: Claim }>('/claims', body, true).pipe(map((r) => r.claim)); }
  update(id: string, body: unknown) { return this.api.patch<{ claim: Claim }>(`/claims/${id}`, body, true).pipe(map((r) => r.claim)); }
  withdraw(id: string) { return this.api.post<{ claim: Claim }>(`/claims/${id}/withdraw`, {}, true).pipe(map((r) => r.claim)); }
  assign(id: string, version: number, staffId?: string) { return this.api.post<{ claim: Claim }>(`/claims/${id}/assign`, { version, staffId }, true).pipe(map((r) => r.claim)); }
  approve(id: string, version: number, adminNote?: string) { return this.api.post<{ claim: Claim }>(`/claims/${id}/approve`, { version, adminNote }, true).pipe(map((r) => r.claim)); }
  reject(id: string, version: number, adminNote: string) { return this.api.post<{ claim: Claim }>(`/claims/${id}/reject`, { version, adminNote }, true).pipe(map((r) => r.claim)); }
  markReturned(id: string, version: number, adminNote?: string) { return this.api.post<{ claim: Claim }>(`/claims/${id}/return`, { version, adminNote }, true).pipe(map((r) => r.claim)); }
  remove(id: string) { return this.api.delete<{ ok: true }>(`/claims/${id}`, true); }
}

export interface UploadProgress { progress: number; file?: StoredFile }

@Injectable({ providedIn: 'root' })
export class FilesService {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  list(params: Record<string, unknown>) { return this.api.get<Paginated<StoredFile>>('/files', params, true); }
  signedUrl(id: string) { return this.api.post<SignedLink>(`/files/${id}/signed-url`, {}, true); }
  remove(id: string) { return this.api.delete<{ ok: true }>(`/files/${id}`, true); }
  link(id: string, entityType: 'item' | 'claim' | 'user', entityId: string) { return this.api.post(`/files/${id}/link`, { entityType, entityId }, true); }
  /** Raw multipart upload with progress. */
  upload(file: File, purpose: FilePurpose): Observable<UploadProgress> {
    const fd = new FormData();
    fd.append('purpose', purpose);
    fd.append('file', file, file.name);
    return this.http.post<{ file: StoredFile }>(`${this.api.base}/files?purpose=${purpose}`, fd, { reportProgress: true, observe: 'events' }).pipe(
      filter((e: HttpEvent<{ file: StoredFile }>) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map((e) => (e.type === HttpEventType.Response ? { progress: 100, file: e.body!.file } : { progress: Math.round((100 * e.loaded) / (e.total ?? e.loaded)) })),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private api = inject(ApiService);
  list(params: Record<string, unknown>) { return this.api.get<Paginated<User>>('/users', params, true); }
  get(id: string) { return this.api.get<{ user: User }>(`/users/${id}`, {}, true).pipe(map((r) => r.user)); }
  update(id: string, body: unknown) { return this.api.patch<{ user: User }>(`/users/${id}`, body, true).pipe(map((r) => r.user)); }
  changePassword(currentPassword: string, newPassword: string) { return this.api.patch('/auth/password', { currentPassword, newPassword }, true); }
}

@Injectable({ providedIn: 'root' })
export class MapService {
  private api = inject(ApiService);
  private cfg?: Observable<MapConfig>;
  config() { return (this.cfg ??= this.api.get<MapConfig>('/map/config')); }
  search(q: string) { return this.api.get<GeoResult<GeoPlace[]>>('/map/search', { q }, true); }
  reverse(lat: number, lng: number) { return this.api.get<GeoResult<GeoPlace>>('/map/reverse', { lat, lng }, true); }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(ApiService);
  stats(params: Record<string, unknown>) { return this.api.get<DashboardStats>('/dashboard/stats', params, true); }
  audit(params: Record<string, unknown>) { return this.api.get<Paginated<AuditEntry>>('/audit-logs', params, true); }
}
