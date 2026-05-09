import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

export default function GitHubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const expectedState = sessionStorage.getItem('github_oauth_state');
    const intent = sessionStorage.getItem('github_oauth_intent') ?? 'login';
    sessionStorage.removeItem('github_oauth_state');
    sessionStorage.removeItem('github_oauth_intent');

    if (!code) {
      setError('Brak code w odpowiedzi GitHub.');
      return;
    }
    if (!state || state !== expectedState) {
      setError('Niepoprawny stan OAuth — możliwy CSRF. Spróbuj ponownie.');
      return;
    }

    api
      .githubLogin(code)
      .then((res) => {
        setSession(res.token, res.expiresAt, res.refreshToken, res.user);
        toast.success(intent === 'register' ? 'Konto utworzone — powodzenia!' : `Cześć, ${res.user.displayName}!`);
        navigate('/my-courses', { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Logowanie GitHub nie powiodło się.');
      });
  }, [params, navigate, setSession]);

  return (
    <section className="max-w-sm mx-auto px-4 py-16 text-center">
      {error ? (
        <>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-3 py-1.5 border rounded-md text-sm"
          >
            Wróć do logowania
          </button>
        </>
      ) : (
        <p className="text-gray-500 text-sm">Loguję przez GitHub…</p>
      )}
    </section>
  );
}
