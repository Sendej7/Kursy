import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AuthorProfile() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['author', id],
    queryFn: () => api.authorProfile(id),
  });

  if (isLoading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;
  if (error || !data)
    return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">Nie znaleziono autora.</p>;

  return (
    <section className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <header className="flex items-center gap-4 border-b pb-6">
        {data.avatarUrl && (
          <img src={data.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{data.displayName}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {data.coursesCount} kursów · {data.studentsTotal} studentów
            {data.reviewCount > 0 && (
              <>
                {' · '}
                <span className="text-amber-600">★ {data.averageRating.toFixed(1)}</span>{' '}
                <span className="text-gray-500">({data.reviewCount} opinii)</span>
              </>
            )}
          </p>
        </div>
      </header>

      <h2 className="text-lg font-semibold">Kursy</h2>
      {data.courses.length === 0 ? (
        <p className="text-gray-500">Brak publicznych kursów.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.courses.map((c) => (
            <li key={c.id}>
              <Link
                to={`/courses/${c.slug}`}
                className="block border rounded-lg bg-white p-4 hover:shadow-md transition"
              >
                <p className="text-xs uppercase text-gray-500">{c.language}</p>
                <h3 className="font-semibold mt-1">{c.title}</h3>
                {c.reviewCount > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ★ {c.averageRating.toFixed(1)}{' '}
                    <span className="text-gray-500">({c.reviewCount})</span>
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{c.description}</p>
                <p className="text-xs text-gray-500 mt-3">
                  {c.priceMonthlyPln ? `${c.priceMonthlyPln} zł/mies (Pro)` : 'darmowe'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
