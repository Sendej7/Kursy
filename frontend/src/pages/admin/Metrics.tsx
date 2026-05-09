import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AdminMetrics() {
  const m = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => api.admin.metrics(),
    refetchInterval: 60_000,
  });

  if (m.isLoading) return <p className="max-w-5xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;
  if (m.error || !m.data)
    return <p className="max-w-5xl mx-auto px-4 py-10 text-red-600">Nie udało się pobrać metryk.</p>;

  const { users, subscriptions, content, engagement } = m.data;

  return (
    <section className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Metryki platformy</h1>
        <p className="text-xs text-gray-500 mt-1">Aktualizowane co 60s.</p>
      </header>

      <Group title="Użytkownicy">
        <Stat label="Łącznie aktywnych" value={users.total} />
        <Stat label="Nowi (7 dni)" value={users.new7d} hint="ostatni tydzień" />
        <Stat label="Nowi (30 dni)" value={users.new30d} hint="ostatni miesiąc" />
        <Stat label="Konta usunięte" value={users.deleted} subtle />
      </Group>

      <Group title="Subskrypcje (Stripe)">
        <Stat label="Aktywne" value={subscriptions.activeCount} highlight />
        <Stat
          label="MRR"
          value={`${subscriptions.mrrPln.toLocaleString('pl-PL')} zł`}
          highlight
          hint="szacunkowo, plan Pro × aktywne"
        />
        <Stat
          label="Canceled (30d)"
          value={subscriptions.canceledLast30d}
          subtle
          hint="churn ostatni miesiąc"
        />
      </Group>

      <Group title="Treść">
        <Stat label="Kursy publiczne" value={content.coursesPublic} />
        <Stat label="Do recenzji" value={content.coursesPending} hint="czeka na admina" />
        <Stat label="Drafty autorów" value={content.coursesDraft} subtle />
        <Stat label="Lekcje" value={content.lessonsTotal} />
        <Stat label="Recenzje" value={content.reviewsTotal} />
      </Group>

      <Group title="Zaangażowanie">
        <Stat label="DAU" value={engagement.dau} hint="active last 24h" highlight />
        <Stat label="WAU" value={engagement.wau} hint="active last 7d" highlight />
        <Stat label="Lekcje ukończone (7d)" value={engagement.lessonsCompletedLast7d} />
        <Stat label="Lekcje ukończone (30d)" value={engagement.lessonsCompletedLast30d} />
        <Stat label="Certyfikaty" value={engagement.certificatesIssued} />
        <Stat label="Pytania Q&A (7d)" value={engagement.questionsLast7d} />
      </Group>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-2">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
  subtle,
}: {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
  subtle?: boolean;
}) {
  return (
    <div
      className={
        'border rounded-lg p-3 ' +
        (highlight ? 'bg-amber-50 border-amber-200' : subtle ? 'bg-gray-50' : 'bg-white')
      }
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString('pl-PL') : value}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
