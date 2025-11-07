import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const term = (q || '').trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form onSubmit={submit} className="hidden md:flex items-center">
      <input
        aria-label="Buscar"
        placeholder="Buscar casos o documentos..."
        className="px-3 py-1 border rounded w-64 text-sm bg-[var(--wm-1)] placeholder:text-[var(--wm-3)] text-[var(--wm-5)]"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="ml-2 px-3 py-1 btn-neutral text-sm">Buscar</button>
    </form>
  );
}
