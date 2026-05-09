import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.stats(),
  });

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Panel admina</h1>

      {isLoading && <p className="text-gray-500">Ładowanie…</p>}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Użytkownicy" value={data.users} />
          <Stat label="Autorzy" value={data.authors} />
          <Stat label="Kursy publiczne" value={data.coursesPublic} />
          <Stat label="Czekają na recenzję" value={data.coursesPending} highlight={data.coursesPending > 0} />
          <Stat label="Kursy w drafcie" value={data.coursesDraft} />
          <Stat label="Próby studentów" value={data.submissions} />
          <Stat label="Pytania do AI" value={data.aiInteractions} />
          <Stat label="Certyfikaty" value={data.certificates} />
          <Stat label="Ukończone lekcje" value={data.lessonsCompletedTotal} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link to="/admin/pending" className="border rounded-lg bg-white p-4 hover:bg-gray-50">
          <h2 className="font-semibold">Kursy do recenzji →</h2>
          <p className="text-xs text-gray-500 mt-1">
            Zatwierdzaj zgłoszenia autorów do publicznego katalogu
          </p>
        </Link>
        <Link to="/admin/users" className="border rounded-lg bg-white p-4 hover:bg-gray-50">
          <h2 className="font-semibold">Użytkownicy →</h2>
          <p className="text-xs text-gray-500 mt-1">Lista, zmiana ról</p>
        </Link>
        <Link to="/admin/orgs" className="border rounded-lg bg-white p-4 hover:bg-gray-50">
          <h2 className="font-semibold">Organizacje (B2B) →</h2>
          <p className="text-xs text-gray-500 mt-1">Uczelnie, firmy, kody hurtowe</p>
        </Link>
        <Link to="/admin/promo-codes" className="border rounded-lg bg-white p-4 hover:bg-gray-50">
          <h2 className="font-semibold">Kody promocyjne →</h2>
          <p className="text-xs text-gray-500 mt-1">Stripe promo codes (LAUNCH20, BLACK60)</p>
        </Link>
        <Link to="/admin/metrics" className="border rounded-lg bg-white p-4 hover:bg-gray-50">
          <h2 className="font-semibold">Metryki platformy →</h2>
          <p className="text-xs text-gray-500 mt-1">DAU, MRR, subskrypcje, lekcje, churn</p>
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`border rounded-lg p-4 ${
        highlight ? 'bg-amber-50 border-amber-200' : 'bg-white'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString('pl-PL')}</p>
    </div>
  );
}
