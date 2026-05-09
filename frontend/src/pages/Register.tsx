import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Register() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [becomeAuthor, setBecomeAuthor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.register(email, password, displayName, becomeAuthor);
      setSession(res.token, res.expiresAt, res.user);
      navigate('/courses', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Załóż konto</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Imię (lub nick)</span>
          <input
            type="text"
            required
            minLength={2}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm">Hasło (min. 8 znaków)</span>
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={becomeAuthor}
            onChange={(e) => setBecomeAuthor(e.target.checked)}
          />
          Chcę tworzyć kursy (autor)
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full px-3 py-2 bg-black text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Tworzę konto…' : 'Załóż konto'}
        </button>
      </form>
      <p className="text-sm text-gray-600 mt-4">
        Masz już konto?{' '}
        <Link to="/login" className="underline">
          Zaloguj się
        </Link>
      </p>
    </section>
  );
}
