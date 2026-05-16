import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Loader2, Trash2, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import Seo from '@/components/Seo';

export default function AdminOrganizations() {
  const qc = useQueryClient();
  const orgs = useQuery({ queryKey: ['admin', 'orgs'], queryFn: () => api.admin.listOrgs() });

  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const createOrg = useMutation({
    mutationFn: () => api.admin.createOrg({
      name,
      nip: nip || undefined,
      contactEmail: contactEmail || undefined,
    }),
    onSuccess: () => {
      setName(''); setNip(''); setContactEmail('');
      qc.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      toast.success('Organizacja utworzona');
    },
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Organizacje — admin" />

      <div className="mb-6 flex items-center gap-3">
        <Building2 className="w-6 h-6 text-brand-600" />
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Organizacje (B2B)</h1>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="font-semibold tracking-tight mb-3">Nowa organizacja</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="input"
            placeholder="Nazwa (np. Politechnika Warszawska)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="NIP (opcjonalnie)"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
          />
          <input
            className="input"
            placeholder="Email kontaktowy"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <button
          className="btn-brand mt-3"
          onClick={() => name.trim() && createOrg.mutate()}
          disabled={createOrg.isPending || !name.trim()}
        >
          {createOrg.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Utwórz organizację
        </button>
      </div>

      {orgs.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {orgs.data?.map((o) => (
          <article key={o.id} className="card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 text-brand-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight truncate">{o.name}</p>
                  <p className="text-xs text-zinc-500">
                    {o.nip ? `NIP: ${o.nip} · ` : ''}
                    {o.codes} kodów · {o.redemptions} aktywacji
                  </p>
                </div>
              </div>
              <button
                className="btn-secondary text-sm shrink-0"
                onClick={() => setActiveOrgId(activeOrgId === o.id ? null : o.id)}
              >
                <KeyRound className="w-4 h-4" />
                {activeOrgId === o.id ? 'Zwiń' : 'Kody'}
              </button>
            </div>
            {activeOrgId === o.id && <CodesPanel orgId={o.id} />}
          </article>
        ))}
        {orgs.data && orgs.data.length === 0 && (
          <div className="card p-12 text-center">
            <Building2 className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Brak organizacji. Utwórz pierwszą powyżej.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CodesPanel({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const codes = useQuery({
    queryKey: ['admin', 'orgs', orgId, 'codes'],
    queryFn: () => api.admin.listOrgCodes(orgId),
  });
  const [seats, setSeats] = useState(50);
  const [months, setMonths] = useState(12);

  const create = useMutation({
    mutationFn: () => api.admin.createOrgCode(orgId, { maxSeats: seats, grantsMonths: months }),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['admin', 'orgs', orgId, 'codes'] });
      qc.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      navigator.clipboard?.writeText(created.code).catch(() => undefined);
      toast.success(`Kod ${created.code} skopiowany`);
    },
  });

  const revoke = useMutation({
    mutationFn: (codeId: string) => api.admin.revokeOrgCode(orgId, codeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orgs', orgId, 'codes'] }),
  });

  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-5 py-4">
      <div className="flex flex-wrap gap-2 items-end mb-3">
        <label className="text-xs">
          <span className="font-medium">Miejsc</span>
          <input
            type="number"
            min={1}
            className="input mt-0.5 !w-24"
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
        </label>
        <label className="text-xs">
          <span className="font-medium">Miesięcy dostępu</span>
          <input
            type="number"
            min={1}
            max={36}
            className="input mt-0.5 !w-24"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          />
        </label>
        <button
          className="btn-brand text-sm"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Generuj kod
        </button>
      </div>

      <ul className="text-sm space-y-1.5">
        {codes.data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between card !p-2.5 !rounded-lg">
            <span className="flex items-center gap-3 min-w-0">
              <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-xs">{c.code}</code>
              <span className="text-xs text-zinc-500 truncate">
                {c.redeemedCount}/{c.maxSeats} · {c.grantsMonths} mies.
              </span>
              {c.revokedAt && <span className="badge bg-rose-50 text-rose-700 text-xs">unieważniony</span>}
              {!c.isUsable && !c.revokedAt && <span className="text-xs text-zinc-400">wyczerpany</span>}
            </span>
            {!c.revokedAt && (
              <button
                className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2 py-1 rounded flex items-center gap-1"
                onClick={() => revoke.mutate(c.id)}
              >
                <Trash2 className="w-3 h-3" />
                Unieważnij
              </button>
            )}
          </li>
        ))}
        {codes.data && codes.data.length === 0 && (
          <p className="text-xs text-zinc-500 italic">Brak kodów.</p>
        )}
      </ul>
    </div>
  );
}
