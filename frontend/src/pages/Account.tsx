import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import BillingProfileForm from '@/components/BillingProfileForm';
import TwoFactorSetup from '@/components/TwoFactorSetup';
import PrivacySection from '@/components/PrivacySection';
import SessionsList from '@/components/SessionsList';
import AchievementsCard from '@/components/AchievementsCard';
import DailyGoalSetting from '@/components/DailyGoalSetting';

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
      toast.success('Subskrypcja aktywowana — sprawdź status poniżej.');
    }
  }, [params]);

  async function openPortal() {
    try {
      const res = await api.billing.portal(window.location.origin + '/account');
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Portal Stripe niedostępny.');
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Konto</h1>
        <p className="text-sm text-gray-600 mt-1">{auth.user?.email}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="XP" value={stats.data?.totalXp ?? 0} />
        <Stat label="Streak" value={stats.data?.currentStreakDays ?? 0} suffix="dni" />
        <Stat label="Lekcje" value={stats.data?.lessonsCompleted ?? 0} />
        <Stat label="Certyfikaty" value={stats.data?.certificatesEarned ?? 0} />
      </div>

      <div className="border rounded-lg bg-white p-5">
        <h2 className="font-semibold">Subskrypcja</h2>

        {billing.data?.configured === false && (
          <p className="text-sm text-gray-500 mt-2">
            Płatności nie są jeszcze skonfigurowane. Skontaktuj się z administratorem.
          </p>
        )}

        {billing.data?.configured && billing.data.isActive && (
          <div className="mt-3 text-sm">
            <p className="text-green-700">✓ Plan Pro aktywny</p>
            {billing.data.currentPeriodEnd && (
              <p className="text-gray-600">
                Następna płatność:{' '}
                {new Date(billing.data.currentPeriodEnd).toLocaleDateString('pl-PL')}
              </p>
            )}
            {billing.data.cancelAtPeriodEnd && (
              <p className="text-amber-700 mt-1">⚠️ Anulowano — wygasa po obecnym okresie</p>
            )}
            <button
              onClick={openPortal}
              className="mt-4 px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
            >
              Zarządzaj subskrypcją (Stripe)
            </button>
          </div>
        )}

        {billing.data?.configured && !billing.data.isActive && (
          <div className="mt-3">
            <p className="text-sm text-gray-700">Brak aktywnej subskrypcji.</p>
            <div className="flex gap-2 mt-3">
              <Link
                to="/pricing"
                className="px-3 py-1.5 bg-black text-white rounded-md text-sm"
              >
                Zobacz cennik
              </Link>
              <Link
                to="/redeem"
                className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
              >
                Mam kod uczelni / firmy
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-lg bg-white p-5">
        <h2 className="font-semibold mb-2">Cel dzienny</h2>
        <DailyGoalSetting />
      </div>

      <div id="achievements" className="border rounded-lg bg-white p-5">
        <h2 className="font-semibold mb-2">Odznaki</h2>
        <AchievementsCard />
      </div>

      <div className="border rounded-lg bg-white p-5">
        <h2 className="font-semibold mb-2">Bezpieczeństwo (2FA)</h2>
        <TwoFactorSetup />
      </div>

      <div className="border rounded-lg bg-white p-5">
        <h2 className="font-semibold mb-2">Zalogowane urządzenia</h2>
        <SessionsList />
      </div>

      <div className="border rounded-lg bg-white p-5">
        <h2 className="font-semibold mb-2">Dane do faktury</h2>
        <BillingProfileForm />
      </div>

      <Invoices />

      <div className="border rounded-lg bg-white p-5">
        <h2 className="font-semibold mb-2">Dane osobowe (RODO)</h2>
        <PrivacySection />
      </div>

      <div className="text-sm text-gray-600">
        <p>
          <Link to="/my-courses" className="underline">
            Moje kursy
          </Link>
          {' · '}
          <Link to="/my-favorites" className="underline">
            Ulubione
          </Link>
          {' · '}
          <Link to="/my-ai-history" className="underline">
            Rozmowy z AI
          </Link>
          {' · '}
          <Link to="/my-certificates" className="underline">
            Moje certyfikaty
          </Link>
        </p>
      </div>
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
    <div className="border rounded-lg bg-white p-5">
      <h2 className="font-semibold mb-2">Faktury</h2>
      <ul className="divide-y">
        {data.map((i) => (
          <li key={i.id} className="py-2 flex items-center justify-between">
            <span className="text-sm">
              <code className="bg-gray-100 px-1 rounded">{i.number}</code>
              <span className="text-gray-500 ml-2">
                {new Date(i.issuedAt).toLocaleDateString('pl-PL')}
              </span>
            </span>
            <span className="text-sm flex items-center gap-3">
              <span>
                {i.grossAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} {i.currency}
              </span>
              <Link to={`/invoices/${i.id}`} className="text-xs underline">
                Pobierz
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold mt-0.5">
        {value.toLocaleString('pl-PL')}
        {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
