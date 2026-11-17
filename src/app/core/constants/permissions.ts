import { Role } from '../interfaces/models';

export type Permission =
  | 'items.read' | 'items.create' | 'items.manageAll' | 'reports.own'
  | 'claims.create' | 'claims.own' | 'claims.review'
  | 'files.own' | 'files.all'
  | 'users.manage' | 'audit.read' | 'dashboard.admin';

/** Client-side mirror of the server's role matrix (the server stays authoritative). */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  student: ['items.read', 'items.create', 'reports.own', 'claims.create', 'claims.own', 'files.own'],
  admin: ['items.read', 'items.create', 'items.manageAll', 'claims.review', 'files.own', 'files.all', 'users.manage', 'audit.read', 'dashboard.admin'],
};

export const can = (role: Role | undefined, p: Permission) => !!role && ROLE_PERMISSIONS[role].includes(p);
