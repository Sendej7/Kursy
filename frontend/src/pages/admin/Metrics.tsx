import { useQuery } from '@tanstack/react-query';
import { TrendingUp, RefreshCw, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import Seo from '@/components/Seo';

export default function AdminMetrics() {
  const m = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => api.admin.metrics(),
    refetchInterval: 60_000,
  });

  if (m.isLoading) {
    return (
      <div className="container-page py-10 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (m.error || !m.data) {
    return (
      <div className="container-narrow py-20 text-center">
        <p className="text-rose-600">Nie udało się pobrać metryk.</p>
      </div>
    );
  }

  const { users, subscriptions, content, engagement } = m.data;

  return (
    <section className="container-page py-10 lg:py-16 space-y-8">
      <Seo title="Metryki — admin" />

      <header>
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-6 h-6 text-brand-600" />
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Metryki platformy</h1>
        </div>
        <p className="text-zinc-500 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Auto-refresh co 60s
        </p>
      </header>

      <Group title="Użytkownicy">
        <Stat label="Łącznie aktywnych" value={users.total} />
        <Stat label="Nowi (7 dni)" value={users.new7d} hint="ostatni tydzień" />
        <Stat label="Nowi (30 dni)" value={users.new30d} hint="ostatni miesiąc" />
        <Stat label="Konta usunięte" value={users.deleted} subtle />
      </Group>

      <Group title="Subskrypcje (Stripe)" icon={TrendingUp}>
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

function Group({ title, icon: Icon, children }: { title: string; icon?: typeof TrendingUp; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {title}
      </h2>
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
    <div className={`card p-4 ${
      highlight ? 'ring-2 ring-brand-300 dark:ring-brand-700' : subtle ? 'opacity-70' : ''
    }`}>
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold tracking-tight mt-1 ${
        highlight ? 'bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent' : ''
      }`}>
        {typeof value === 'number' ? value.toLocaleString('pl-PL') : value}
      </p>
      {hint && <p className="text-[10px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}
