import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function AdminPromoCodes() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin', 'promo-codes'],
    queryFn: () => api.admin.promoCodes.list(),
  });

  const [code, setCode] = useState('');
  const [percentOff, setPercentOff] = useState<number | ''>(20);
  const [maxRedemptions, setMaxRedemptions] = useState<number | ''>('');
  const [expiresDays, setExpiresDays] = useState<number | ''>(30);

  const create = useMutation({
    mutationFn: () => {
      const expiresAt =
        expiresDays === '' ? null : new Date(Date.now() + Number(expiresDays) * 86_400_000).toISOString();
      return api.admin.promoCodes.create({
        code,
        percentOff: percentOff === '' ? null : Number(percentOff),
        maxRedemptions: maxRedemptions === '' ? null : Number(maxRedemptions),
        expiresAt,
      });
    },
    onSuccess: (created) => {
      toast.success(`Kod ${created.code} utworzony.`);
      navigator.clipboard?.writeText(created.code).catch(() => undefined);
      setCode('');
      qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.admin.promoCodes.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] }),
  });

  return (
    <section className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Kody promocyjne (Stripe)</h1>
      <p className="text-sm text-gray-600">
        Tworzy Stripe Coupon + PromotionCode. Klient wpisuje kod w Stripe Checkout
        (wymagane <code>AllowPromotionCodes</code> — już ustawione).
      </p>

      <form
        className="border rounded-lg bg-white p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim().length < 3) {
            toast.error('Kod musi mieć min 3 znaki.');
            return;
          }
          create.mutate();
        }}
      >
        <label className="block text-xs">
          <span>Kod</span>
          <input
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm font-mono uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            maxLength={32}
            placeholder="LAUNCH20"
          />
        </label>
        <label className="block text-xs">
          <span>Rabat %</span>
          <input
            type="number"
            min={1}
            max={100}
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={percentOff}
            onChange={(e) => setPercentOff(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
        <label className="block text-xs">
          <span>Max użyć</span>
          <input
            type="number"
            min={1}
            placeholder="∞"
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
        <label className="block text-xs">
          <span>Wygasa za (dni)</span>
          <input
            type="number"
            min={1}
            max={365}
            placeholder="bez wygaśnięcia"
            className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
            value={expiresDays}
            onChange={(e) => setExpiresDays(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
        <button
          type="submit"
          disabled={create.isPending || code.trim().length < 3}
          className="self-end px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
        >
          {create.isPending ? 'Tworzę…' : 'Utwórz kod'}
        </button>
      </form>

      {list.isLoading && <p className="text-gray-500">Ładowanie…</p>}
      {list.error && <p className="text-red-600 text-sm">{(list.error as Error).message}</p>}

      <ul className="space-y-2">
        {list.data?.map((c) => (
          <li key={c.id} className="border rounded-md bg-white px-3 py-2 flex items-center justify-between gap-3">
            <span className="flex-1 text-sm">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{c.code}</code>
              <span className="text-xs text-gray-500 ml-2">
                {c.percentOff !== null ? `${c.percentOff}% off` : `${(c.amountOffGr ?? 0) / 100} zł off`}
                {' · '}
                {c.timesRedeemed}
                {c.maxRedemptions !== null && `/${c.maxRedemptions}`} użyć
                {c.expiresAt && ` · wygasa ${new Date(c.expiresAt).toLocaleDateString('pl-PL')}`}
                {!c.active && ' · WYŁĄCZONY'}
              </span>
            </span>
            {c.active && (
              <button
                onClick={() => {
                  if (confirm(`Wyłączyć ${c.code}? (Stripe nie pozwala kasować, tylko deaktywować)`)) {
                    deactivate.mutate(c.id);
                  }
                }}
                className="text-xs text-red-700 hover:underline"
              >
                Wyłącz
              </button>
            )}
          </li>
        ))}
        {list.data && list.data.length === 0 && (
          <p className="text-gray-500 text-sm">Brak kodów. Utwórz pierwszy powyżej.</p>
        )}
      </ul>
    </section>
  );
}
