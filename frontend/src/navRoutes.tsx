import { ChartBarIcon, DocumentTextIcon, UserGroupIcon, CalendarIcon, UserCircleIcon, ShieldCheckIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export type NavRoute = {
  path: string;
  label: string;
  icon: any;
  roles?: string[]; // allowed roles (if omitted, visible to all authenticated non-HR)
  hrOnly?: boolean;
};

const navRoutes: NavRoute[] = [
  { path: '/', label: 'Dashboard', icon: ChartBarIcon },
  { path: '/cases', label: 'Casos', icon: DocumentTextIcon },
  { path: '/cases/kanban', label: 'Tablero Casos', icon: ClipboardDocumentListIcon },
  { path: '/cases/history', label: 'Casos históricos', icon: DocumentTextIcon },
  { path: '/clients', label: 'Clientes', icon: UserGroupIcon },
  { path: '/documents', label: 'Documentos', icon: DocumentTextIcon },
  { path: '/calendar', label: 'Agenda', icon: CalendarIcon },
  { path: '/reports', label: 'Reportes', icon: ChartBarIcon, roles: ['admin', 'partner', 'staff', 'hr'] },
  { path: '/reports/workload', label: 'Carga de trabajo', icon: ChartBarIcon, roles: ['admin', 'partner', 'staff', 'hr'] },
  { path: '/users', label: 'Usuarios', icon: UserCircleIcon, roles: ['hr', 'admin', 'partner', 'staff'] },
  { path: '/roles', label: 'Roles', icon: UserGroupIcon, roles: ['admin', 'partner', 'staff'] },
  { path: '/permissions', label: 'Permisos', icon: ShieldCheckIcon, roles: ['admin'] },
];

export default navRoutes;
