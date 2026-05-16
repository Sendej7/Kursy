import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  PenTool,
  BookOpen,
  Clock,
  FileText,
  Bot,
  Award,
  CheckCircle2,
  ArrowRight,
  Building2,
  Tag,
  BarChart3,
  ClipboardCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import Seo from '@/components/Seo';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.stats(),
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Panel admina" />

      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Panel admina</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Statystyki platformy i zarządzanie systemem.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
          <Stat label="Użytkownicy" value={data.users} icon={Users} color="brand" />
          <Stat label="Autorzy" value={data.authors} icon={PenTool} color="purple" />
          <Stat label="Kursy publiczne" value={data.coursesPublic} icon={BookOpen} color="emerald" />
          <Stat
            label="Do recenzji"
            value={data.coursesPending}
            icon={Clock}
            color="amber"
            highlight={data.coursesPending > 0}
          />
          <Stat label="Drafty kursów" value={data.coursesDraft} icon={FileText} color="zinc" />
          <Stat label="Próby studentów" value={data.submissions} icon={ClipboardCheck} color="sky" />
          <Stat label="Pytania do AI" value={data.aiInteractions} icon={Bot} color="purple" />
          <Stat label="Certyfikaty" value={data.certificates} icon={Award} color="amber" />
          <Stat label="Ukończone lekcje" value={data.lessonsCompletedTotal} icon={CheckCircle2} color="emerald" />
        </div>
      )}

      <h2 className="font-semibold text-lg tracking-tight mb-3">Zarządzanie</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Tile to="/admin/pending" icon={Clock} title="Kursy do recenzji" body="Zatwierdzaj zgłoszenia autorów do publicznego katalogu" />
        <Tile to="/admin/users" icon={Users} title="Użytkownicy" body="Lista, zmiana ról" />
        <Tile to="/admin/orgs" icon={Building2} title="Organizacje (B2B)" body="Uczelnie, firmy, kody hurtowe" />
        <Tile to="/admin/promo-codes" icon={Tag} title="Kody promocyjne" body="Stripe promo codes (LAUNCH20, BLACK60)" />
        <Tile to="/admin/metrics" icon={BarChart3} title="Metryki platformy" body="DAU, MRR, subskrypcje, lekcje, churn" />
      </div>
    </section>
  );
}

const COLOR_MAP: Record<string, string> = {
  brand: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30',
  emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  sky: 'text-sky-600 bg-sky-50 dark:bg-sky-900/30',
  zinc: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800',
};

function Stat({
  label,
  value,
  icon: Icon,
  color,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-5 ${highlight ? 'ring-2 ring-amber-300 dark:ring-amber-700' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500 font-medium">{label}</p>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLOR_MAP[color]}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value.toLocaleString('pl-PL')}</p>
    </div>
  );
}

function Tile({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  body: string;
}) {
  return (
    <Link to={to} className="card-hover p-5 flex items-center gap-4 group">
      <span className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold tracking-tight group-hover:text-brand-600 transition-colors">{title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{body}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
