import { Role } from '../interfaces/models';

export type Permission =
  | 'items.read' | 'items.create' | 'items.manageAll' | 'reports.own'
  | 'claims.create' | 'claims.own' | 'claims.review' | 'claims.assign'
  | 'files.own' | 'files.all'
  | 'users.manage' | 'users.roles' | 'audit.read' | 'dashboard.admin';

const STAFF: Permission[] = ['items.read', 'items.create', 'items.manageAll', 'claims.review', 'files.own', 'files.all', 'users.manage', 'audit.read', 'dashboard.admin'];

/** Client-side mirror of the server's role matrix (the server stays authoritative). */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Reports lost/found items, claims items, follows their own requests.
  student: ['items.read', 'items.create', 'reports.own', 'claims.create', 'claims.own', 'files.own'],
  // Lost & Found Office staff: pick up and process claims, manage items, (de)activate students.
  admin: STAFF,
  // System owner: everything staff can do + roles, staff accounts and assigning claims to staff.
  super_admin: [...STAFF, 'users.roles', 'claims.assign'],
};

export const ROLE_LABEL: Record<Role, string> = { student: 'Student', admin: 'Staff', super_admin: 'Super admin' };
export const ROLE_ICON: Record<Role, string> = { student: 'pi pi-graduation-cap', admin: 'pi pi-briefcase', super_admin: 'pi pi-shield' };
export const ROLE_SEVERITY: Record<Role, 'info' | 'warn' | 'contrast'> = { student: 'info', admin: 'warn', super_admin: 'contrast' };
export const isStaffRole = (r?: Role | null) => r === 'admin' || r === 'super_admin';

export const can = (role: Role | undefined, p: Permission) => !!role && ROLE_PERMISSIONS[role].includes(p);
