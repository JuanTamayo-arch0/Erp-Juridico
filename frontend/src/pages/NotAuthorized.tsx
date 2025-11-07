import React from 'react';
import { Link } from 'react-router-dom';

export default function NotAuthorized() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">No autorizado</h1>
      <p className="mb-4">No tienes permiso para ver esta página.</p>
      <Link to="/" className="text-sm text-blue-600">Volver al tablero</Link>
    </div>
  );
}
