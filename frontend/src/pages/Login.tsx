import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
  await login(email, password);
  navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md card">
        <h2 className="text-xl font-semibold mb-4">Iniciar sesión</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--wm-4)]">Email</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 text-[var(--wm-5)] placeholder:text-[var(--wm-3)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--wm-4)]">Contraseña</label>
            <input
              type="password"
              className="mt-1 w-full border rounded px-3 py-2 text-[var(--wm-5)] placeholder:text-[var(--wm-3)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-red-600">{error}</div>}
          <button type="submit" className="w-full btn-primary text-center">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
