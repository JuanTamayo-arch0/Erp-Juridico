import React, { useEffect, useState } from 'react';
import client from '../services/httpClient';
import { useAuth } from '../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';

type Client = { id: number; name: string; email?: string };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    client.get(`/clients/?page=${page}`).then((data: any) => {
      setClients(data.results || []);
      setNext(data.next || null);
      setPrevious(data.previous || null);
    });
  }, [token, page]);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, email };
    await client.post('/clients/', payload);
    client.get(`/clients/?page=${page}`).then((data: any) => setClients(data.results || []));
    setName('');
    setEmail('');
  }

  return (
    <div className="app-container">
      <div className="mt-4 card">
  <h2 className="text-xl font-semibold mb-4">Clientes</h2>
        <form onSubmit={createClient} className="mb-4 flex gap-2">
          <input className="flex-1 border px-2 py-1 rounded" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-48 border px-2 py-1 rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn-primary" type="submit">Crear</button>
        </form>
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id} className="p-3 card-soft flex items-center justify-between">
              <div>
                <Link to={`/clients/${c.id}`} className="font-medium link-accent">{c.name}</Link>
                <div className="text-sm muted-dark">{c.email}</div>
              </div>
              <Link to={`/clients/${c.id}`} className="text-sm link-accent">Ver / Editar</Link>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 mt-4">
          <button
            className="px-3 py-1 btn-neutral"
            onClick={() => setSearchParams({ page: String(Math.max(1, page - 1)) })}
            disabled={!previous}
          >
            Anterior
          </button>
          <button
            className="px-3 py-1 btn-neutral"
            onClick={() => setSearchParams({ page: String(page + 1) })}
            disabled={!next}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
