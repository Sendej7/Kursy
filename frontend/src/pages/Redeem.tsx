import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function Redeem() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await api.redeemCode(code.trim());
      qc.invalidateQueries({ queryKey: ['billing', 'status'] });
      toast.success(
        `Dostęp Pro aktywowany${res.organizationName ? ` (${res.organizationName})` : ''} — do ${new Date(
          res.accessUntil,
        ).toLocaleDateString('pl-PL')}`,
      );
      navigate('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-3">Wpisz kod uczelni / firmy</h1>
      <p className="text-sm text-gray-600 mb-6">
        Jeśli Twoja uczelnia lub pracodawca wykupił dostęp do Kursy.pl, wpisz tu otrzymany kod —
        dostaniesz plan Pro na czas określony.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          required
          className="w-full border rounded-md px-3 py-2 text-sm font-mono"
          placeholder="EDU-XXXX..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="w-full px-3 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
        >
          {pending ? 'Aktywuję…' : 'Aktywuj kod'}
        </button>
      </form>
    </section>
  );
}
