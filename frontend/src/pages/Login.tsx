import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Mail, Lock, Loader2 } from 'lucide-react';
import { api, isTwoFactorChallenge } from '@/lib/api';
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
  const [twoFactor, setTwoFactor] = useState<{ pendingToken: string; email: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const target = location.state?.from ?? '/my-courses';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.login(email, password);
      if (isTwoFactorChallenge(res)) {
        setTwoFactor({ pendingToken: res.pendingToken, email: res.email });
        return;
      }
      setSession(res.token, res.expiresAt, res.refreshToken, res.user);
      toast.success(`Cześć, ${res.user.displayName}!`);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  async function submitTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!twoFactor) return;
    setError(null);
    setPending(true);
    try {
      const res = await api.loginTwoFactor(twoFactor.email, twoFactor.pendingToken, twoFactorCode);
      setSession(res.token, res.expiresAt, res.refreshToken, res.user);
      toast.success(`Cześć, ${res.user.displayName}!`);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieprawidłowy kod 2FA.');
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
    <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-fade pointer-events-none" />

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-bold text-lg justify-center w-full mb-8"
        >
          <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <GraduationCap className="w-4 h-4" />
          </span>
          Kursy<span className="text-brand-600">.pl</span>
        </Link>

        <div className="card p-8">
          {twoFactor ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Weryfikacja 2FA</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 mb-6">
                Wpisz 6-cyfrowy kod z aplikacji dla <strong>{twoFactor.email}</strong>, albo 8-znakowy kod awaryjny.
              </p>
              <form onSubmit={submitTwoFactor} className="space-y-4">
                <input
                  inputMode="text"
                  maxLength={9}
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="123456 lub ABCD2345"
                  className="input text-center !text-2xl tracking-widest font-mono !py-3"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                />
                {error && <p className="text-rose-600 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={pending || twoFactorCode.length < 6}
                  className="btn-brand w-full !py-3"
                >
                  {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {pending ? 'Sprawdzam…' : 'Zatwierdź'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactor(null);
                    setTwoFactorCode('');
                    setError(null);
                  }}
                  className="btn-ghost w-full"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anuluj
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Zaloguj się</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 mb-6">
                Witaj z powrotem 👋
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-center">
                  <GoogleSignInButton onCredential={onGoogle} />
                </div>
                <GitHubSignInButton intent="login" />
              </div>

              <div className="flex items-center gap-3 my-5 text-xs text-zinc-400">
                <span className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
                <span className="uppercase tracking-wider">lub email</span>
                <span className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
              </div>

              <form onSubmit={submit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</span>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      className="input pl-9"
                      placeholder="ty@kursy.pl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </label>
                <label className="block">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Hasło</span>
                    <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">
                      Zapomniałeś?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      className="input pl-9"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </label>
                {error && <p className="text-rose-600 text-sm">{error}</p>}
                <button type="submit" disabled={pending} className="btn-brand w-full !py-3">
                  {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {pending ? 'Logowanie…' : 'Zaloguj się'}
                </button>
              </form>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-6 text-center">
                Nie masz konta?{' '}
                <Link to="/register" className="font-medium text-brand-600 hover:underline">
                  Zarejestruj się
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
