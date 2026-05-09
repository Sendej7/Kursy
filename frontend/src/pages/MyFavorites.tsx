import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function MyFavorites() {
  const list = useQuery({
    queryKey: ['favorites', 'mine'],
    queryFn: () => api.myFavorites(),
  });

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Moje ulubione kursy</h1>

      {list.isLoading && <p className="text-gray-500">Ładowanie…</p>}
      {!list.isLoading && (list.data?.length ?? 0) === 0 && (
        <p className="text-gray-500">
          Brak ulubionych. Wejdź na{' '}
          <Link to="/courses" className="underline">
            katalog
          </Link>{' '}
          i kliknij 🤍 obok kursu, żeby zapisać go na później.
        </p>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.data?.map((c) => (
          <li key={c.courseId}>
            <Link
              to={`/courses/${c.slug}`}
              className="block border rounded-lg p-4 bg-white hover:shadow-md transition"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">{c.language}</p>
              <h2 className="font-semibold text-lg mt-1">{c.title}</h2>
              {c.reviewCount > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ★ {c.averageRating.toFixed(1)} <span className="text-gray-500">({c.reviewCount})</span>
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
    </section>
  );
}
