import React from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import navRoutes from '../navRoutes';
import { HomeIcon } from '@heroicons/react/24/outline';

const LinkItem: React.FC<{ to: string; icon?: React.ReactNode; children: React.ReactNode; collapsed?: boolean }> = ({ to, icon, children, collapsed=false }) => (
  <NavLink
    to={to}
    title={collapsed ? String(children) : undefined}
    className={({ isActive }) => `flex items-center gap-3 ${collapsed ? 'justify-center px-2 py-2' : 'px-4 py-3'} rounded-lg hover:bg-white/5 transition duration-150 transform hover:scale-[1.02] ${isActive ? 'bg-white/6' : ''}`}
  >
    {icon}
    {!collapsed && <span className="text-sm">{children}</span>}
  </NavLink>
);

export default function Sidebar({ collapsed=false /* onToggle intentionally unused: toggle via TopBar */ }:{collapsed?:boolean; onToggle?:()=>void}) {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isHR = roles.includes('hr');
  return (
  <aside style={{ background: 'linear-gradient(180deg, var(--wm-5), var(--wm-4))' }} className={`${collapsed ? 'w-20' : 'w-64'} min-h-screen sticky top-0 p-4 flex flex-col text-[var(--wm-1)] transition-all`}> 
      <div className="flex items-center gap-3 mb-6">
        <div className={`${collapsed ? 'h-8 w-8' : 'h-9 w-9'} rounded-lg bg-white/6 flex items-center justify-center bg-accent-gradient`}> <HomeIcon className="w-4 h-4 text-[var(--wm-1)]"/> </div>
        {!collapsed && (
          <div>
            <div className="font-semibold text-base">ERP Jurídico</div>
            <div className="text-xs text-white/80">Panel</div>
          </div>
        )}
      </div>

      <nav className="space-y-1 mt-2">
        {isHR ? (
          // HR only sees a filtered subset: Dashboard, Clientes, Reportes, Carga de trabajo, Usuarios
          <>
            {navRoutes.filter(r => ['/', '/clients', '/reports', '/reports/workload', '/users'].includes(r.path)).map(r => {
              const Icon = r.icon;
              return (
                <LinkItem key={r.path} collapsed={collapsed} to={r.path} icon={<Icon className="w-5 h-5 text-white/90"/>}>{r.label}</LinkItem>
              );
            })}
          </>
        ) : (
          <>
            {navRoutes.map((r) => {
              // if route has role restrictions, only show if user has any of them
              if (r.roles && r.roles.length > 0) {
                const allowed = r.roles.some(rr => roles.includes(rr));
                if (!allowed) return null;
              }
              const Icon = r.icon;
              return <LinkItem key={r.path} collapsed={collapsed} to={r.path} icon={<Icon className="w-5 h-5 text-white/90"/>}>{r.label}</LinkItem>;
            })}
          </>
        )}
      </nav>

      <div className="mt-auto pt-6">
        {!collapsed && <div className="text-xs text-white/70">v0.1 • Local</div>}
      </div>
    </aside>
  );
}
