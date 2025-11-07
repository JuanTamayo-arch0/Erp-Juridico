import React from 'react';
import DashboardPanel from '../components/DashboardPanel';

export default function Home() {
  return (
    <div>
      <main className="mt-6">
        <div className="app-container">
          <div className="card">
            <h2 className="text-2xl font-semibold text-slate-900">Bienvenido</h2>
            <p className="mt-2 text-muted">Empieza creando un caso o revisa tu agenda.</p>
            <div className="mt-4">
              <DashboardPanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
