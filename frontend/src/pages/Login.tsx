import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import GitHubSignInButton from '@/components/GitHubSignInButton';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const target = location.state?.from ?? '/my-courses';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.login(email, password);
      setSession(res.token, res.expiresAt, res.refreshToken, res.user);
      toast.success(`Cześć, ${res.user.displayName}!`);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  const onGoogle = useCallback(
    async (idToken: string) => {
      try {
        const res = await api.googleLogin(idToken);
        setSession(res.token, res.expiresAt, res.refreshToken, res.user);
        toast.success(`Cześć, ${res.user.displayName}!`);
        navigate(target, { replace: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Logowanie Google nie powiodło się.');
      }
    },
    [setSession, navigate, target],
  );

  return (
    <section className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Zaloguj się</h1>

      <div className="mb-3 flex justify-center">
        <GoogleSignInButton onCredential={onGoogle} />
      </div>
      <div className="mb-4">
        <GitHubSignInButton intent="login" />
      </div>

      <div className="flex items-center gap-3 my-4 text-xs text-gray-500">
        <span className="flex-1 border-t" />
        <span>lub</span>
        <span className="flex-1 border-t" />
      </div>

      <form onSubmit={submit} className="space-y-3">
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
          <span className="text-sm">Hasło</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full px-3 py-2 bg-black text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Logowanie…' : 'Zaloguj'}
        </button>
      </form>
      <p className="text-sm text-gray-600 mt-4">
        Nie masz konta?{' '}
        <Link to="/register" className="underline">
          Zarejestruj się
        </Link>
        {' · '}
        <Link to="/forgot-password" className="underline">
          Zapomniałeś hasła?
        </Link>
      </p>
    </section>
  );
}
