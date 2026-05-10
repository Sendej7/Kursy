import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function AuthorPayouts() {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ['author', 'stripe-connect', 'status'],
    queryFn: () => api.author.stripeConnect.status(),
  });

  const onboard = useMutation({
    mutationFn: () => api.author.stripeConnect.onboard(),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd onboarding.'),
  });

  const dashboard = useMutation({
    mutationFn: () => api.author.stripeConnect.dashboardLink(),
    onSuccess: (res) => {
      window.open(res.url, '_blank', 'noopener,noreferrer');
      qc.invalidateQueries({ queryKey: ['author', 'stripe-connect', 'status'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  if (status.isLoading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;

  return (
    <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Wypłaty</h1>
        <p className="text-sm text-gray-600 mt-1">
          Kursy.pl wypłaca autorom udział w przychodach z subskrypcji studentów. Wypłaty obsługuje
          Stripe Connect Express — Twoje dane KYC i konto bankowe podasz w ich UI.
        </p>
      </header>

      {!status.data?.configured && (
        <div className="border rounded-md bg-amber-50 border-amber-300 p-3 text-sm">
          Stripe nie jest skonfigurowany na tej instancji. Skontaktuj się z administratorem.
        </div>
      )}

      {status.data?.configured && !status.data.connected && (
        <div className="border rounded-lg bg-white p-5 space-y-3">
          <p className="text-sm">
            Aby otrzymywać wypłaty, połącz konto Stripe (~5 minut). Stripe poprosi o NIP, dane
            kontaktowe i numer konta bankowego.
          </p>
          <button
            onClick={() => onboard.mutate()}
            disabled={onboard.isPending}
            className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
          >
            {onboard.isPending ? 'Generuję link…' : 'Połącz konto Stripe'}
          </button>
        </div>
      )}

      {status.data?.connected && (
        <div className="border rounded-lg bg-white p-5 space-y-3">
          <p className="text-sm">
            Konto Stripe:{' '}
            {status.data.payoutsEnabled ? (
              <span className="text-green-700">✓ aktywne, wypłaty włączone</span>
            ) : (
              <span className="text-amber-700">⚠️ wymagane uzupełnienie danych</span>
            )}
            {status.data.detailsSubmitted ? '' : ' (onboarding niedokończony)'}
          </p>

          {status.data.requirementsDue && status.data.requirementsDue.length > 0 && (
            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
              <p className="font-semibold mb-1">Stripe wymaga jeszcze:</p>
              <ul className="list-disc list-inside">
                {status.data.requirementsDue.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => dashboard.mutate()}
              disabled={dashboard.isPending}
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {dashboard.isPending ? 'Otwieram…' : 'Otwórz dashboard Stripe'}
            </button>
            {!status.data.detailsSubmitted && (
              <button
                onClick={() => onboard.mutate()}
                disabled={onboard.isPending}
                className="px-3 py-1.5 bg-black text-white rounded-md text-sm disabled:opacity-50"
              >
                Dokończ onboarding
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        ← <Link to="/author" className="underline">Wróć do panelu autora</Link>
      </p>
    </section>
  );
}
