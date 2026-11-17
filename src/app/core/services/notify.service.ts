import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  private messages = inject(MessageService);
  success(summary: string, detail?: string) { this.messages.add({ severity: 'success', summary, detail, life: 3500 }); }
  error(summary: string, detail?: string) { this.messages.add({ severity: 'error', summary, detail, life: 6000 }); }
  info(summary: string, detail?: string) { this.messages.add({ severity: 'info', summary, detail, life: 4000 }); }
  warn(summary: string, detail?: string) { this.messages.add({ severity: 'warn', summary, detail, life: 5000 }); }
}
