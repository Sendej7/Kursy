import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const handled = useRef(false);
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get('code');
    if (!code) {
      setState('error');
      setMessage('Brak kodu w linku.');
      return;
    }
    api
      .verifyEmail(code)
      .then(() => {
        setState('ok');
        // Aktualizuj cache lokalnego usera (bez ponownego logowania).
        if (auth.user) {
          auth.setUser({ ...auth.user, emailConfirmed: true });
        }
      })
      .catch((err) => {
        setState('error');
        setMessage(err instanceof Error ? err.message : 'Coś poszło nie tak.');
      });
  }, [params, auth]);

  return (
    <section className="max-w-md mx-auto px-4 py-16 text-center">
      {state === 'pending' && <p className="text-gray-500">Sprawdzam link…</p>}
      {state === 'ok' && (
        <>
          <h1 className="text-xl font-bold">✓ Email potwierdzony</h1>
          <p className="text-sm text-gray-600 mt-2">Dziękujemy! Twoje konto jest aktywne.</p>
          <Link
            to="/my-courses"
            className="inline-block mt-6 px-3 py-1.5 bg-black text-white rounded-md text-sm"
          >
            Otwórz moje kursy
          </Link>
        </>
      )}
      {state === 'error' && (
        <>
          <h1 className="text-xl font-bold text-red-700">Nie udało się potwierdzić</h1>
          <p className="text-sm text-gray-600 mt-2">{message}</p>
          <Link
            to="/account"
            className="inline-block mt-6 px-3 py-1.5 border rounded-md text-sm"
          >
            Wróć do konta
          </Link>
        </>
      )}
    </section>
  );
}
