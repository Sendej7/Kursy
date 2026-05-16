import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Loader2, Power } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import Seo from '@/components/Seo';

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
      toast.success(`Kod ${created.code} utworzony (skopiowany)`);
      navigator.clipboard?.writeText(created.code).catch(() => undefined);
      setCode('');
      qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.admin.promoCodes.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promo-codes'] }),
  });

  return (
    <section className="container-page py-10 lg:py-16 space-y-6">
      <Seo title="Kody promocyjne — admin" />

      <div>
        <div className="flex items-center gap-3 mb-2">
          <Tag className="w-6 h-6 text-brand-600" />
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Kody promocyjne</h1>
        </div>
        <p className="text-zinc-500">
          Tworzy Stripe Coupon + PromotionCode. Klient wpisuje kod w Stripe Checkout.
        </p>
      </div>

      <form
        className="card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim().length < 3) {
            toast.error('Kod musi mieć min 3 znaki');
            return;
          }
          create.mutate();
        }}
      >
        <h2 className="font-semibold tracking-tight mb-3">Nowy kod</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="block text-xs">
            <span className="font-medium">Kod</span>
            <input
              className="input mt-1 font-mono uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
              maxLength={32}
              placeholder="LAUNCH20"
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium">Rabat %</span>
            <input
              type="number"
              min={1}
              max={100}
              className="input mt-1"
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium">Max użyć</span>
            <input
              type="number"
              min={1}
              placeholder="∞"
              className="input mt-1"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
          <label className="block text-xs">
            <span className="font-medium">Wygasa (dni)</span>
            <input
              type="number"
              min={1}
              max={365}
              placeholder="bez wygaśnięcia"
              className="input mt-1"
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </label>
          <button
            type="submit"
            disabled={create.isPending || code.trim().length < 3}
            className="btn-brand self-end"
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Utwórz
          </button>
        </div>
      </form>

      {list.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}
      {list.error && <p className="text-rose-600 text-sm">{(list.error as Error).message}</p>}

      <div className="space-y-2">
        {list.data?.map((c) => (
          <article key={c.id} className="card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded font-mono text-sm shrink-0">{c.code}</code>
              <span className="text-xs text-zinc-500 truncate">
                {c.percentOff !== null ? `${c.percentOff}% off` : `${(c.amountOffGr ?? 0) / 100} zł off`}
                {' · '}{c.timesRedeemed}{c.maxRedemptions !== null && `/${c.maxRedemptions}`} użyć
                {c.expiresAt && ` · wygasa ${new Date(c.expiresAt).toLocaleDateString('pl-PL')}`}
              </span>
              {!c.active && <span className="badge bg-rose-50 text-rose-700">WYŁĄCZONY</span>}
            </div>
            {c.active && (
              <button
                onClick={() => {
                  if (confirm(`Wyłączyć ${c.code}?`)) deactivate.mutate(c.id);
                }}
                className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2 py-1 rounded flex items-center gap-1"
              >
                <Power className="w-3 h-3" />
                Wyłącz
              </button>
            )}
          </article>
        ))}
        {list.data && list.data.length === 0 && (
          <div className="card p-12 text-center">
            <Tag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Brak kodów. Utwórz pierwszy powyżej.</p>
          </div>
        )}
      </div>
    </section>
  );
}
