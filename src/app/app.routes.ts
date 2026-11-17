import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '',
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    canActivate: [guestGuard],
    children: [
      { path: 'login', title: 'Sign in · CampusFind', loadComponent: () => import('./pages/auth/login/login').then((m) => m.LoginPage) },
      { path: 'register', title: 'Student registration · CampusFind', loadComponent: () => import('./pages/auth/register/register').then((m) => m.RegisterPage) },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', title: 'Dashboard · CampusFind', data: { crumb: 'Dashboard' }, loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage) },
      { path: 'items', title: 'Lost & found directory · CampusFind', data: { crumb: 'Directory' }, loadComponent: () => import('./pages/items/item-list/item-list').then((m) => m.ItemListPage) },
      { path: 'items/new/:type', title: 'New report · CampusFind', data: { crumb: 'New report', permission: 'items.create' }, canActivate: [roleGuard], loadComponent: () => import('./pages/items/item-form/item-form').then((m) => m.ItemFormPage) },
      { path: 'items/:id', title: 'Item details · CampusFind', data: { crumb: 'Item details' }, loadComponent: () => import('./pages/items/item-detail/item-detail').then((m) => m.ItemDetailPage) },
      { path: 'items/:id/edit', title: 'Edit report · CampusFind', data: { crumb: 'Edit report' }, loadComponent: () => import('./pages/items/item-form/item-form').then((m) => m.ItemFormPage) },
      { path: 'my-reports', title: 'My reports · CampusFind', data: { crumb: 'My reports', roles: ['student'] }, canActivate: [roleGuard], loadComponent: () => import('./pages/items/my-reports/my-reports').then((m) => m.MyReportsPage) },
      { path: 'claims', title: 'My claims · CampusFind', data: { crumb: 'My claims', roles: ['student'] }, canActivate: [roleGuard], loadComponent: () => import('./pages/claims/my-claims/my-claims').then((m) => m.MyClaimsPage) },
      { path: 'claims/new/:foundItemId', title: 'Submit claim · CampusFind', data: { crumb: 'Submit claim', roles: ['student'] }, canActivate: [roleGuard], loadComponent: () => import('./pages/claims/claim-form/claim-form').then((m) => m.ClaimFormPage) },
      { path: 'admin/claims', title: 'Claim review · CampusFind', data: { crumb: 'Claim review', roles: ['admin'] }, canActivate: [roleGuard], loadComponent: () => import('./pages/admin/admin-claims/admin-claims').then((m) => m.AdminClaimsPage) },
      { path: 'admin/items', title: 'Item administration · CampusFind', data: { crumb: 'Item administration', roles: ['admin'] }, canActivate: [roleGuard], loadComponent: () => import('./pages/admin/admin-items/admin-items').then((m) => m.AdminItemsPage) },
      { path: 'admin/users', title: 'Users · CampusFind', data: { crumb: 'Users', roles: ['admin'] }, canActivate: [roleGuard], loadComponent: () => import('./pages/admin/admin-users/admin-users').then((m) => m.AdminUsersPage) },
      { path: 'admin/audit', title: 'Activity audit · CampusFind', data: { crumb: 'Activity audit', roles: ['admin'] }, canActivate: [roleGuard], loadComponent: () => import('./pages/admin/admin-audit/admin-audit').then((m) => m.AdminAuditPage) },
      { path: 'files', title: 'My documents · CampusFind', data: { crumb: 'My documents' }, loadComponent: () => import('./pages/files/files').then((m) => m.FilesPage) },
      { path: 'profile', title: 'My profile · CampusFind', data: { crumb: 'My profile' }, loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfilePage) },
    ],
  },
  { path: 'forbidden', title: 'Access denied · CampusFind', loadComponent: () => import('./pages/status/status-page').then((m) => m.ForbiddenPage) },
  { path: '**', title: 'Page not found · CampusFind', loadComponent: () => import('./pages/status/status-page').then((m) => m.NotFoundPage) },
];
