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
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [regenPrompt, setRegenPrompt] = useState(false);
  const [regenCode, setRegenCode] = useState('');

  const status = useQuery({
    queryKey: ['2fa', 'status'],
    queryFn: () => api.twoFactor.status(),
  });

  const remaining = useQuery({
    queryKey: ['2fa', 'backup-remaining'],
    queryFn: () => api.twoFactor.backupCodesRemaining(),
    enabled: status.data?.enabled === true,
  });

  const startSetup = useMutation({
    mutationFn: () => api.twoFactor.setup(),
    onSuccess: (data) => setSetup(data),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd setup 2FA.'),
  });

  const enable = useMutation({
    mutationFn: () => api.twoFactor.enable(code),
    onSuccess: (data) => {
      toast.success('2FA włączone — zapisz kody awaryjne!');
      setBackupCodes(data.backupCodes);
      setSetup(null);
      setCode('');
      qc.invalidateQueries({ queryKey: ['2fa', 'status'] });
      qc.invalidateQueries({ queryKey: ['2fa', 'backup-remaining'] });
      if (auth.user) auth.setUser({ ...auth.user, twoFactorEnabled: true });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Nieprawidłowy kod.'),
  });

  const regenerate = useMutation({
    mutationFn: () => api.twoFactor.regenerateBackupCodes(regenCode),
    onSuccess: (data) => {
      toast.success('Wygenerowane nowe kody — zapisz je! Stare przestają działać.');
      setBackupCodes(data.backupCodes);
      setRegenPrompt(false);
      setRegenCode('');
      qc.invalidateQueries({ queryKey: ['2fa', 'backup-remaining'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Nieprawidłowy kod.'),
  });

  function downloadBackupCodes() {
    if (!backupCodes) return;
    const content =
      'Kody awaryjne 2FA — Kursy.pl\n' +
      `Wygenerowane: ${new Date().toLocaleString('pl-PL')}\n` +
      `Konto: ${auth.user?.email ?? '?'}\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nKażdy kod jest jednorazowy. Trzymaj w bezpiecznym miejscu.\n';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kursy-pl-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

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

  // Modal-like blok z 10 kodami awaryjnymi (po enable lub regenerate).
  if (backupCodes) {
    return (
      <div className="border border-amber-300 bg-amber-50 rounded-lg p-4 space-y-3">
        <p className="font-semibold">🔐 Twoje kody awaryjne (jednorazowe)</p>
        <p className="text-xs text-gray-700">
          Zapisz je teraz — każdy z nich można użyć zamiast kodu z apki, jeśli zgubisz telefon.
          <strong className="block mt-1">Kody pokażą się tylko raz.</strong>
        </p>
        <ul className="grid grid-cols-2 gap-1 font-mono text-sm bg-white border rounded p-3">
          {backupCodes.map((c, i) => (
            <li key={i}>
              <span className="text-gray-400 mr-1">{i + 1}.</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            onClick={downloadBackupCodes}
            className="px-3 py-1.5 bg-black text-white rounded-md text-sm"
          >
            Pobierz plik .txt
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(backupCodes.join('\n')).catch(() => undefined);
              toast.success('Skopiowane do schowka.');
            }}
            className="px-3 py-1.5 border rounded-md text-sm"
          >
            Skopiuj
          </button>
          <button
            onClick={() => setBackupCodes(null)}
            className="px-3 py-1.5 text-sm text-gray-600"
          >
            Zapisałem, zamknij
          </button>
        </div>
      </div>
    );
  }

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

      {enabled && !disablePrompt && !regenPrompt && (
        <div className="space-y-2">
          <p className="text-sm text-green-700">✓ 2FA aktywne — logowanie wymaga kodu z apki.</p>
          {remaining.data && (
            <p className="text-xs text-gray-600">
              Pozostało {remaining.data.remaining} kodów awaryjnych.
              {remaining.data.remaining <= 3 && (
                <span className="text-amber-700 ml-1">
                  — wygeneruj nowe, zanim Ci się skończą.
                </span>
              )}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setRegenPrompt(true)}
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
            >
              Wygeneruj nowe kody awaryjne
            </button>
            <button
              onClick={() => setDisablePrompt(true)}
              className="px-3 py-1.5 border rounded-md text-sm text-red-700 hover:bg-red-50"
            >
              Wyłącz 2FA
            </button>
          </div>
        </div>
      )}

      {enabled && regenPrompt && (
        <div className="space-y-2">
          <p className="text-sm">
            Wpisz aktualny kod 2FA, żeby wygenerować nowe kody awaryjne. <strong>Stare przestaną
            działać.</strong>
          </p>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={6}
              className="border rounded-md px-2 py-1 text-sm font-mono w-28 text-center"
              value={regenCode}
              onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
            />
            <button
              onClick={() => regenerate.mutate()}
              disabled={regenCode.length !== 6 || regenerate.isPending}
              className="px-3 py-1 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {regenerate.isPending ? 'Generuję…' : 'Wygeneruj'}
            </button>
            <button
              onClick={() => {
                setRegenPrompt(false);
                setRegenCode('');
              }}
              className="px-3 py-1 text-sm text-gray-500"
            >
              Anuluj
            </button>
          </div>
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
