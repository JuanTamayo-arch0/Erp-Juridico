import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserProfile from './UserProfile';
import ConfirmDialog from './ConfirmDialog';

export default function Header() {
  const { user, logout } = useAuth();

  const [dialog, setDialog] = useState(false);
  function handleLogout() {
    setDialog(true);
  }

  return (
  <header className="w-full bg-[var(--card-surface)] shadow-sm">
      <div className="app-container flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold">ERP Jurídico</h1>
          <div className="text-sm muted">Panel</div>
        </div>
        <nav className="ml-6">
          <NavLink to="/" className={({isActive}) => isActive ? 'mr-4 font-semibold' : 'mr-4'}>Inicio</NavLink>
          {/* Hide Casos for HR role */}
          {!(useAuth().user?.roles || []).includes('hr') && (
            <NavLink to="/cases" className={({isActive}) => isActive ? 'mr-4 font-semibold' : 'mr-4'}>Casos</NavLink>
          )}
          <NavLink to="/clients" className={({isActive}) => isActive ? 'mr-4 font-semibold' : 'mr-4'}>Clientes</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:block">
            <UserProfile />
          </div>
          <button
            onClick={handleLogout}
            className="btn-danger hover:opacity-90"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      {dialog && (
        <ConfirmDialog
          title="Confirmar"
          message="¿Cerrar sesión?"
          variant="warning"
          confirmText="Salir"
          cancelText="Cancelar"
          onConfirm={() => { logout(); setDialog(false); }}
          onCancel={() => setDialog(false)}
        />
      )}
    </header>
  );
}
