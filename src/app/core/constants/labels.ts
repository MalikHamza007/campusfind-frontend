import { Category, ClaimStatus, ItemStatus } from '../interfaces/models';

export const CATEGORY_LABELS: Record<Category, string> = {
  id_card: 'ID card', electronics: 'Electronics', calculator: 'Calculator', book: 'Book & notes',
  keys: 'Keys', wallet: 'Wallet', clothing: 'Clothing', other: 'Other',
};
export const CATEGORY_ICONS: Record<Category, string> = {
  id_card: 'pi pi-id-card', electronics: 'pi pi-mobile', calculator: 'pi pi-calculator', book: 'pi pi-book',
  keys: 'pi pi-key', wallet: 'pi pi-wallet', clothing: 'pi pi-shopping-bag', other: 'pi pi-box',
};
export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  open: 'Open', claim_pending: 'Claim pending', matched: 'Matched', returned: 'Returned', closed: 'Closed',
};
export const ITEM_STATUS_SEVERITY: Record<ItemStatus, 'info' | 'warn' | 'success' | 'secondary' | 'contrast'> = {
  open: 'info', claim_pending: 'warn', matched: 'contrast', returned: 'success', closed: 'secondary',
};
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: 'Pending review', approved: 'Approved', rejected: 'Rejected', withdrawn: 'Withdrawn', returned: 'Returned',
};
export const CLAIM_STATUS_SEVERITY: Record<ClaimStatus, 'info' | 'warn' | 'success' | 'secondary' | 'danger' | 'contrast'> = {
  pending: 'warn', approved: 'contrast', rejected: 'danger', withdrawn: 'secondary', returned: 'success',
};
export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as Category[]).map((value) => ({ value, label: CATEGORY_LABELS[value], icon: CATEGORY_ICONS[value] }));
export const ITEM_STATUS_OPTIONS = (Object.keys(ITEM_STATUS_LABELS) as ItemStatus[]).map((value) => ({ value, label: ITEM_STATUS_LABELS[value] }));
export const CLAIM_STATUS_OPTIONS = (Object.keys(CLAIM_STATUS_LABELS) as ClaimStatus[]).map((value) => ({ value, label: CLAIM_STATUS_LABELS[value] }));
export const LOCATIONS = ['Main Library', 'IT Lab 03', 'Cafeteria', 'Auditorium', 'Admin Block', 'Sports Complex', 'Parking Area', 'Engineering Block'];

export const ACTION_LABELS: Record<string, string> = {
  'item.lost_reported': 'reported a lost item',
  'item.found_reported': 'reported a found item',
  'item.updated': 'updated a report',
  'item.deleted': 'deleted a report',
  'item.restored': 'restored a report',
  'item.returned': 'marked an item returned',
  'claim.created': 'submitted a claim',
  'claim.approved': 'approved a claim',
  'claim.rejected': 'rejected a claim',
  'claim.auto_rejected': 'closed a competing claim',
  'claim.returned': 'confirmed a handover',
  'claim.withdrawn': 'withdrew a claim',
  'claim.updated': 'updated a claim',
  'claim.deleted': 'deleted a claim',
  'file.uploaded': 'uploaded a file',
  'file.deleted': 'deleted a file',
  'file.linked': 'attached a file',
  'user.registered': 'joined CampusFind',
  'user.profile_updated': 'updated their profile',
  'user.access_changed': 'changed account access',
  'user.password_changed': 'changed their password',
  'auth.login': 'signed in',
  'auth.logout': 'signed out',
  'auth.login_failed': 'failed sign-in attempt',
};
