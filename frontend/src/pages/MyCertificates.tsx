import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function MyCertificates() {
  const { data, isLoading } = useQuery({
    queryKey: ['me', 'certificates'],
    queryFn: () => api.myCertificates(),
  });

  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Moje certyfikaty</h1>

      {isLoading && <p className="text-gray-500">Ładowanie…</p>}

      <ul className="space-y-3">
        {data?.map((c) => (
          <li key={c.code} className="border rounded-lg bg-white p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{c.courseTitle}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                kod: <code className="bg-gray-100 px-1 rounded">{c.code}</code> · wydany{' '}
                {new Date(c.issuedAt).toLocaleDateString('pl-PL')}
              </p>
            </div>
            <Link
              to={`/certificates/${c.code}`}
              className="text-sm px-3 py-1.5 border rounded-md hover:bg-gray-50"
            >
              Zobacz
            </Link>
          </li>
        ))}
        {data && data.length === 0 && (
          <p className="text-gray-500">
            Nie masz jeszcze certyfikatów. Ukończ kurs, by go zdobyć.
          </p>
        )}
      </ul>
    </section>
  );
}
