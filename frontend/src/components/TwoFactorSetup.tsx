import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

export default function TwoFactorSetup() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [setup, setSetup] = useState<{ secret: string; otpAuthUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [disablePrompt, setDisablePrompt] = useState(false);

  const status = useQuery({
    queryKey: ['2fa', 'status'],
    queryFn: () => api.twoFactor.status(),
  });

  const startSetup = useMutation({
    mutationFn: () => api.twoFactor.setup(),
    onSuccess: (data) => setSetup(data),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd setup 2FA.'),
  });

  const enable = useMutation({
    mutationFn: () => api.twoFactor.enable(code),
    onSuccess: () => {
      toast.success('2FA włączone — odtąd logowanie wymaga kodu z aplikacji.');
      setSetup(null);
      setCode('');
      qc.invalidateQueries({ queryKey: ['2fa', 'status'] });
      if (auth.user) auth.setUser({ ...auth.user, twoFactorEnabled: true });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Nieprawidłowy kod.'),
  });

  const disable = useMutation({
    mutationFn: () => api.twoFactor.disable(code),
    onSuccess: () => {
      toast.success('2FA wyłączone.');
      setDisablePrompt(false);
      setCode('');
      qc.invalidateQueries({ queryKey: ['2fa', 'status'] });
      if (auth.user) auth.setUser({ ...auth.user, twoFactorEnabled: false });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Nieprawidłowy kod.'),
  });

  const enabled = status.data?.enabled ?? false;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Logowanie 2FA dodaje drugi krok — 6-cyfrowy kod z aplikacji autoryzacyjnej (Google
        Authenticator, 1Password, Bitwarden, Aegis).
      </p>

      {!enabled && !setup && (
        <button
          onClick={() => startSetup.mutate()}
          disabled={startSetup.isPending}
          className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
        >
          {startSetup.isPending ? 'Generuję…' : 'Włącz 2FA'}
        </button>
      )}

      {!enabled && setup && (
        <div className="space-y-3">
          <p className="text-sm">
            <strong>1.</strong> Zeskanuj QR w apce autoryzacyjnej (lub wpisz kod ręcznie).
          </p>
          <div className="inline-block bg-white p-3 border rounded">
            <QRCodeSVG value={setup.otpAuthUri} size={180} />
          </div>
          <p className="text-xs text-gray-600">
            Kod ręczny:{' '}
            <code className="bg-gray-100 px-1 rounded font-mono break-all">{setup.secret}</code>
          </p>
          <p className="text-sm">
            <strong>2.</strong> Wpisz 6-cyfrowy kod z apki, żeby potwierdzić:
          </p>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              className="border rounded-md px-2 py-1 text-sm font-mono w-28 text-center"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
            />
            <button
              onClick={() => enable.mutate()}
              disabled={code.length !== 6 || enable.isPending}
              className="px-3 py-1 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {enable.isPending ? 'Sprawdzam…' : 'Potwierdź'}
            </button>
            <button
              onClick={() => {
                setSetup(null);
                setCode('');
              }}
              className="px-3 py-1 text-sm text-gray-500"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {enabled && !disablePrompt && (
        <div className="space-y-2">
          <p className="text-sm text-green-700">✓ 2FA aktywne — logowanie wymaga kodu z apki.</p>
          <button
            onClick={() => setDisablePrompt(true)}
            className="px-3 py-1.5 border rounded-md text-sm text-red-700 hover:bg-red-50"
          >
            Wyłącz 2FA
          </button>
        </div>
      )}

      {enabled && disablePrompt && (
        <div className="space-y-2">
          <p className="text-sm">Wpisz kod z apki, żeby wyłączyć 2FA:</p>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              className="border rounded-md px-2 py-1 text-sm font-mono w-28 text-center"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
            />
            <button
              onClick={() => disable.mutate()}
              disabled={code.length !== 6 || disable.isPending}
              className="px-3 py-1 bg-red-600 text-white rounded-md text-sm disabled:opacity-50"
            >
              {disable.isPending ? 'Sprawdzam…' : 'Wyłącz'}
            </button>
            <button
              onClick={() => {
                setDisablePrompt(false);
                setCode('');
              }}
              className="px-3 py-1 text-sm text-gray-500"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
