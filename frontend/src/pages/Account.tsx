import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Flame,
  BookOpen,
  Award,
  CheckCircle2,
  CreditCard,
  Settings,
  Shield,
  Smartphone,
  FileText,
  Lock,
  Receipt,
  Target,
  Trophy,
  Heart,
  Bot,
  GraduationCap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import BillingProfileForm from '@/components/BillingProfileForm';
import TwoFactorSetup from '@/components/TwoFactorSetup';
import PrivacySection from '@/components/PrivacySection';
import SessionsList from '@/components/SessionsList';
import AchievementsCard from '@/components/AchievementsCard';
import DailyGoalSetting from '@/components/DailyGoalSetting';
import Seo from '@/components/Seo';

export default function Account() {
  const auth = useAuth();
  const [params] = useSearchParams();

  const billing = useQuery({
    queryKey: ['billing', 'status'],
    queryFn: () => api.billing.status(),
  });
  const stats = useQuery({
    queryKey: ['me', 'stats'],
    queryFn: () => api.myStats(),
    enabled: auth.isAuthenticated(),
  });

  useEffect(() => {
    if (params.get('status') === 'success') {
      toast.success('Subskrypcja aktywowana');
    }
  }, [params]);

  async function openPortal() {
    try {
      const res = await api.billing.portal(window.location.origin + '/account');
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Portal niedostępny');
    }
  }

  return (
    <section className="container-page py-10 lg:py-16 space-y-6">
      <Seo title="Moje konto" />

      {/* Header */}
      <header className="card p-6 bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
            {(auth.user?.displayName ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{auth.user?.displayName}</h1>
            <p className="text-brand-100 text-sm">{auth.user?.email}</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Sparkles} label="XP" value={stats.data?.totalXp ?? 0} color="brand" />
        <Stat icon={Flame} label="Seria dni" value={stats.data?.currentStreakDays ?? 0} suffix="d" color="amber" />
        <Stat icon={BookOpen} label="Lekcje" value={stats.data?.lessonsCompleted ?? 0} color="emerald" />
        <Stat icon={Award} label="Certyfikaty" value={stats.data?.certificatesEarned ?? 0} color="purple" />
      </div>

      {/* Subscription */}
      <SectionCard icon={CreditCard} title="Subskrypcja">
        {billing.data?.configured === false && (
          <p className="text-sm text-zinc-500">
            Płatności nie są skonfigurowane.
          </p>
        )}
        {billing.data?.configured && billing.data.isActive && (
          <div className="space-y-2">
            <p className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Plan Pro aktywny
            </p>
            {billing.data.currentPeriodEnd && (
              <p className="text-sm text-zinc-500">
                Następna płatność: {new Date(billing.data.currentPeriodEnd).toLocaleDateString('pl-PL')}
              </p>
            )}
            {billing.data.cancelAtPeriodEnd && (
              <p className="text-sm text-amber-600">⚠️ Anulowano — wygasa po obecnym okresie</p>
            )}
            <button onClick={openPortal} className="btn-secondary mt-3">
              <Settings className="w-4 h-4" />
              Zarządzaj w Stripe
            </button>
          </div>
        )}
        {billing.data?.configured && !billing.data.isActive && (
          <div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">Brak aktywnej subskrypcji.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/pricing" className="btn-brand text-sm">Zobacz cennik</Link>
              <Link to="/redeem" className="btn-secondary text-sm">Mam kod uczelni / firmy</Link>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickLink to="/my-courses" icon={GraduationCap} label="Moje kursy" />
        <QuickLink to="/my-favorites" icon={Heart} label="Ulubione" />
        <QuickLink to="/my-ai-history" icon={Bot} label="Rozmowy AI" />
        <QuickLink to="/my-certificates" icon={Award} label="Certyfikaty" />
      </div>

      <SectionCard icon={Target} title="Cel dzienny">
        <DailyGoalSetting />
      </SectionCard>

      <SectionCard icon={Trophy} title="Odznaki" id="achievements">
        <AchievementsCard />
      </SectionCard>

      <SectionCard icon={Shield} title="Bezpieczeństwo (2FA)">
        <TwoFactorSetup />
      </SectionCard>

      <SectionCard icon={Smartphone} title="Zalogowane urządzenia">
        <SessionsList />
      </SectionCard>

      <SectionCard icon={FileText} title="Dane do faktury">
        <BillingProfileForm />
      </SectionCard>

      <Invoices />

      <SectionCard icon={Lock} title="Dane osobowe (RODO)">
        <PrivacySection />
      </SectionCard>
    </section>
  );
}

function Invoices() {
  const { data } = useQuery({
    queryKey: ['invoices', 'mine'],
    queryFn: () => api.invoices.mine(),
  });

  if (!data || data.length === 0) return null;

  return (
    <SectionCard icon={Receipt} title="Faktury">
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 -my-2">
        {data.map((i) => (
          <li key={i.id} className="py-3 flex items-center justify-between">
            <div>
              <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-xs">{i.number}</code>
              <span className="text-xs text-zinc-500 ml-2">
                {new Date(i.issuedAt).toLocaleDateString('pl-PL')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">
                {i.grossAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {i.currency}
              </span>
              <Link to={`/invoices/${i.id}`} className="text-brand-600 text-xs hover:underline">
                Pobierz
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function SectionCard({
  icon: Icon, title, id, children,
}: { icon: typeof Sparkles; title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card p-5">
      <h2 className="font-semibold tracking-tight mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand-600" />
        {title}
      </h2>
      {children}
    </section>
  );
}

const STAT_COLORS: Record<string, string> = {
  brand: 'text-brand-600 bg-brand-50 dark:bg-brand-900/30',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
};

function Stat({
  icon: Icon, label, value, suffix, color,
}: { icon: typeof Sparkles; label: string; value: number; suffix?: string; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${STAT_COLORS[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight">
        {value.toLocaleString('pl-PL')}
        {suffix && <span className="text-sm font-normal text-zinc-500 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof Sparkles; label: string }) {
  return (
    <Link to={to} className="card-hover p-4 flex flex-col items-center text-center group">
      <Icon className="w-5 h-5 text-brand-600 mb-1.5 group-hover:scale-110 transition-transform" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
