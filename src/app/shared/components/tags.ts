import { Component, computed, input } from '@angular/core';
import { Tag } from 'primeng/tag';
import { CLAIM_STATUS_LABELS, CLAIM_STATUS_SEVERITY, ITEM_STATUS_LABELS, ITEM_STATUS_SEVERITY, CATEGORY_ICONS, CATEGORY_LABELS } from '../../core/constants/labels';
import { Category, ClaimStatus, ItemStatus, ReportType } from '../../core/interfaces/models';

@Component({
  selector: 'app-item-status',
  imports: [Tag],
  template: `<p-tag [value]="label()" [severity]="sev()" [rounded]="true" />`,
})
export class ItemStatusTag {
  status = input.required<ItemStatus>();
  label = computed(() => ITEM_STATUS_LABELS[this.status()] ?? this.status());
  sev = computed(() => ITEM_STATUS_SEVERITY[this.status()] ?? 'secondary');
}

@Component({
  selector: 'app-claim-status',
  imports: [Tag],
  template: `<p-tag [value]="label()" [severity]="sev()" [rounded]="true" />`,
})
export class ClaimStatusTag {
  status = input.required<ClaimStatus>();
  label = computed(() => CLAIM_STATUS_LABELS[this.status()] ?? this.status());
  sev = computed(() => CLAIM_STATUS_SEVERITY[this.status()] ?? 'secondary');
}

/** Luggage-tag chip carrying the item code (CF-L-1001 / CF-F-2001). */
@Component({
  selector: 'app-code-tag',
  template: `<span class="cf-code-tag" [attr.aria-label]="'Item code ' + code()">{{ code() }}</span>`,
})
export class CodeTag {
  code = input.required<string>();
}

@Component({
  selector: 'app-type-pill',
  template: `<span class="cf-type-pill" [class.lost]="type() === 'lost'" [class.found]="type() === 'found'"><span class="cf-type-dot" [class]="'cf-type-' + type()"></span>{{ type() === 'lost' ? 'Lost' : 'Found' }}</span>`,
})
export class TypePill {
  type = input.required<ReportType>();
}

@Component({
  selector: 'app-category',
  template: `<span class="inline-flex items-center gap-1.5 text-sm"><i [class]="icon()" class="text-xs cf-muted"></i>{{ label() }}</span>`,
})
export class CategoryLabel {
  category = input.required<Category>();
  icon = computed(() => CATEGORY_ICONS[this.category()]);
  label = computed(() => CATEGORY_LABELS[this.category()]);
}
