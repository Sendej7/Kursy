import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

export default function PrivacySection() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [confirmStep, setConfirmStep] = useState<null | 'first' | 'second'>(null);
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const exportMut = useMutation({
    mutationFn: () => api.privacy.exportData(),
    onSuccess: () => toast.success('Dane wyeksportowane — pobierz plik z paska przeglądarki.'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd eksportu.'),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.privacy.deleteAccount({
      password: password || undefined,
      twoFactorCode: twoFactorCode || undefined,
    }),
    onSuccess: () => {
      toast.success('Konto usunięte. Żegnaj!');
      auth.clear();
      navigate('/');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Zgodnie z RODO masz prawo do pobrania swoich danych i usunięcia konta. Usunięcie
        anonimizuje konto — Twoje recenzje, pytania i odpowiedzi pozostają (jako „konto usunięte"),
        ale wszystkie dane osobowe (email, imię, hasło, klucze OAuth) są bezpowrotnie kasowane.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => exportMut.mutate()}
          disabled={exportMut.isPending}
          className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {exportMut.isPending ? 'Generuję…' : 'Pobierz moje dane (JSON)'}
        </button>

        {confirmStep === null && (
          <button
            onClick={() => setConfirmStep('first')}
            className="px-3 py-1.5 border rounded-md text-sm text-red-700 hover:bg-red-50"
          >
            Usuń konto
          </button>
        )}
      </div>

      {confirmStep === 'first' && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
          <p className="text-sm text-red-900">
            ⚠️ Ta operacja jest <strong>nieodwracalna</strong>. Twoje dane osobowe zostaną
            bezpowrotnie skasowane.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmStep('second')}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm"
            >
              Rozumiem, kontynuuj
            </button>
            <button
              onClick={() => setConfirmStep(null)}
              className="px-3 py-1.5 border rounded-md text-sm"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {confirmStep === 'second' && (
        <form
          className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            deleteMut.mutate();
          }}
        >
          <p className="text-sm text-red-900">Potwierdź swoją tożsamość:</p>
          <input
            type="password"
            placeholder="Hasło (jeśli ustawione)"
            className="w-full border rounded-md px-2 py-1 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {auth.user?.twoFactorEnabled && (
            <input
              inputMode="numeric"
              maxLength={6}
              placeholder="Kod 2FA"
              className="w-full border rounded-md px-2 py-1 text-sm font-mono"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
            />
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={deleteMut.isPending}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm disabled:opacity-50"
            >
              {deleteMut.isPending ? 'Usuwam…' : 'Usuń konto na stałe'}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmStep(null);
                setPassword('');
                setTwoFactorCode('');
              }}
              className="px-3 py-1.5 border rounded-md text-sm"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
