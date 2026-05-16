import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User as UserIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import GitHubSignInButton from '@/components/GitHubSignInButton';

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
      setSession(res.token, res.expiresAt, res.refreshToken, res.user);
      toast.success('Konto utworzone. Powodzenia!');
      navigate(becomeAuthor ? '/author' : '/courses', { replace: true });
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
        toast.success('Konto utworzone. Powodzenia!');
        navigate('/my-courses', { replace: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Logowanie Google nie powiodło się.');
      }
    },
    [setSession, navigate],
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
          <h1 className="text-2xl font-bold tracking-tight">Załóż konto</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 mb-6">
            Darmowo. Bez karty. Zacznij naukę w 30 sekund.
          </p>

          <div className="space-y-2 mb-4">
            <div className="flex justify-center">
              <GoogleSignInButton onCredential={onGoogle} />
            </div>
            <GitHubSignInButton intent="register" />
          </div>

          <div className="flex items-center gap-3 my-5 text-xs text-zinc-400">
            <span className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
            <span className="uppercase tracking-wider">lub email</span>
            <span className="flex-1 border-t border-zinc-200 dark:border-zinc-800" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Imię lub nick</span>
              <div className="relative mt-1">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  minLength={2}
                  className="input pl-9"
                  placeholder="Jan Kowalski"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </label>
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
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Hasło (min. 8 znaków)</span>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </label>
            <label className="flex items-start gap-2 text-sm select-none cursor-pointer group">
              <input
                type="checkbox"
                checked={becomeAuthor}
                onChange={(e) => setBecomeAuthor(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                Chcę także <strong>tworzyć kursy</strong> (konto autora)
              </span>
            </label>
            {error && <p className="text-rose-600 text-sm">{error}</p>}
            <button type="submit" disabled={pending} className="btn-brand w-full !py-3">
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              {pending ? 'Tworzę konto…' : 'Załóż darmowe konto'}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Zakładając konto akceptujesz <Link to="/terms" className="underline">regulamin</Link>.
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-6 text-center">
            Masz już konto?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
