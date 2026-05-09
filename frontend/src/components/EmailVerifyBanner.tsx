import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

export default function EmailVerifyBanner() {
  const auth = useAuth();
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Pokazuj tylko zalogowanym, którzy nie mają potwierdzonego emaila.
  // (`emailConfirmed === false` — nie używamy `!auth.user.emailConfirmed` żeby `undefined` z legacy
  // sesji nie pokazywało bannera dla wszystkich.)
  if (!auth.user || auth.user.emailConfirmed !== false || dismissed) return null;

  async function resend() {
    setPending(true);
    try {
      await api.resendVerification();
      toast.success('Wysłaliśmy nowy link na Twój email.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <p className="text-amber-900">
          ⚠️ Twój email <strong>{auth.user.email}</strong> nie jest jeszcze potwierdzony. Sprawdź skrzynkę.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={resend}
            disabled={pending}
            className="text-amber-900 underline hover:no-underline disabled:opacity-50"
          >
            {pending ? 'Wysyłam…' : 'Wyślij ponownie'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700 hover:text-amber-900"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
