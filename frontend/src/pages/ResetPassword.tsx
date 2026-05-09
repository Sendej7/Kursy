import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api.resetPassword(code.trim(), password);
      toast.success('Hasło zmienione. Zaloguj się.');
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Ustaw nowe hasło</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Kod z emaila</span>
          <input
            required
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Nowe hasło (min. 8 znaków)</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
        >
          {pending ? 'Zapisuję…' : 'Ustaw nowe hasło'}
        </button>
      </form>
      <p className="text-sm text-gray-600 mt-4">
        <Link to="/login" className="underline">
          Wróć do logowania
        </Link>
      </p>
    </section>
  );
}
