import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function AdminOrganizations() {
  const qc = useQueryClient();
  const orgs = useQuery({ queryKey: ['admin', 'orgs'], queryFn: () => api.admin.listOrgs() });

  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const createOrg = useMutation({
    mutationFn: () =>
      api.admin.createOrg({
        name,
        nip: nip || undefined,
        contactEmail: contactEmail || undefined,
      }),
    onSuccess: () => {
      setName('');
      setNip('');
      setContactEmail('');
      qc.invalidateQueries({ queryKey: ['admin', 'orgs'] });
      toast.success('Organizacja utworzona.');
    },
  });

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Organizacje (B2B)</h1>

      <div className="border rounded-lg bg-white p-4 mb-6">
        <h2 className="font-semibold mb-2">Nowa organizacja</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="Nazwa (np. Politechnika Warszawska)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="NIP (opcjonalnie)"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
          />
          <input
            className="border rounded-md px-2 py-1 text-sm"
            placeholder="Email kontaktowy"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <button
          className="mt-3 px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
          onClick={() => name.trim() && createOrg.mutate()}
          disabled={createOrg.isPending || !name.trim()}
        >
          {createOrg.isPending ? 'Tworzę…' : 'Utwórz organizację'}
        </button>
      </div>

      {orgs.isLoading && <p className="text-gray-500">Ładowanie…</p>}

      <ul className="space-y-3">
        {orgs.data?.map((o) => (
          <li key={o.id} className="border rounded-lg bg-white">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">{o.name}</p>
                <p className="text-xs text-gray-500">
                  {o.nip ? `NIP: ${o.nip} · ` : ''}
                  {o.codes} kodów · {o.redemptions} aktywacji
                </p>
              </div>
              <button
                className="text-sm underline"
                onClick={() => setActiveOrgId(activeOrgId === o.id ? null : o.id)}
              >
                {activeOrgId === o.id ? 'Zamknij' : 'Kody dostępu'}
              </button>
            </div>
            {activeOrgId === o.id && <CodesPanel orgId={o.id} />}
          </li>
        ))}
        {orgs.data && orgs.data.length === 0 && (
          <p className="text-gray-500">Brak organizacji. Utwórz pierwszą powyżej.</p>
        )}
      </ul>
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
      toast.success(`Kod ${created.code} utworzony i skopiowany.`);
    },
  });

  const revoke = useMutation({
    mutationFn: (codeId: string) => api.admin.revokeOrgCode(orgId, codeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orgs', orgId, 'codes'] }),
  });

  return (
    <div className="border-t bg-gray-50 px-4 py-3">
      <div className="flex flex-wrap gap-2 items-end mb-3">
        <label className="text-xs">
          <span>Miejsc</span>
          <input
            type="number"
            min={1}
            className="block mt-0.5 border rounded px-2 py-1 text-sm w-24"
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
          />
        </label>
        <label className="text-xs">
          <span>Miesięcy dostępu</span>
          <input
            type="number"
            min={1}
            max={36}
            className="block mt-0.5 border rounded px-2 py-1 text-sm w-24"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          />
        </label>
        <button
          className="px-3 py-1 bg-black text-white rounded-md text-sm disabled:opacity-50"
          onClick={() => create.mutate()}
          disabled={create.isPending}
        >
          {create.isPending ? 'Tworzę…' : 'Generuj kod'}
        </button>
      </div>

      <ul className="text-sm space-y-1">
        {codes.data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between bg-white border rounded-md px-3 py-2">
            <span className="flex items-center gap-3">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{c.code}</code>
              <span className="text-xs text-gray-500">
                {c.redeemedCount}/{c.maxSeats} miejsc · {c.grantsMonths} mies.
              </span>
              {c.revokedAt && <span className="text-xs text-red-600">unieważniony</span>}
              {!c.isUsable && !c.revokedAt && <span className="text-xs text-gray-500">wyczerpany</span>}
            </span>
            {!c.revokedAt && (
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={() => revoke.mutate(c.id)}
              >
                Unieważnij
              </button>
            )}
          </li>
        ))}
        {codes.data && codes.data.length === 0 && (
          <p className="text-xs text-gray-500">Brak kodów. Wygeneruj pierwszy.</p>
        )}
      </ul>
    </div>
  );
}
