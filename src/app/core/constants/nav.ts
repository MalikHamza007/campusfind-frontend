import { Permission } from './permissions';

export interface NavItem { label: string; icon: string; route: string; permission?: Permission; exact?: boolean }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'pi pi-th-large', route: '/dashboard' },
      { label: 'Lost & found directory', icon: 'pi pi-search', route: '/items', exact: true },
    ],
  },
  {
    label: 'Report',
    items: [
      { label: 'Report lost item', icon: 'pi pi-exclamation-circle', route: '/items/new/lost', permission: 'items.create' },
      { label: 'Report found item', icon: 'pi pi-inbox', route: '/items/new/found', permission: 'items.create' },
    ],
  },
  {
    label: 'My space',
    items: [
      { label: 'My reports', icon: 'pi pi-list', route: '/my-reports', permission: 'reports.own' },
      { label: 'My claims', icon: 'pi pi-verified', route: '/claims', permission: 'claims.own' },
      { label: 'My documents', icon: 'pi pi-folder', route: '/files', permission: 'files.own' },
    ],
  },
  {
    label: 'Office',
    items: [
      { label: 'Claim review', icon: 'pi pi-check-square', route: '/admin/claims', permission: 'claims.review' },
      { label: 'Item administration', icon: 'pi pi-box', route: '/admin/items', permission: 'items.manageAll' },
      { label: 'Users', icon: 'pi pi-users', route: '/admin/users', permission: 'users.manage' },
      { label: 'Activity audit', icon: 'pi pi-history', route: '/admin/audit', permission: 'audit.read' },
    ],
  },
];
