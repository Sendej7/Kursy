import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Polecone kursy — collaborative filtering po enrollment patterns, z fallbackiem do top-rated.
 * Zwraca null gdy zero polecanych (np. brak innych kursów na platformie).
 */
export default function RecommendedCourses() {
  const list = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.recommendations(),
    staleTime: 5 * 60_000, // 5 min cache — algorytm nie zmienia się często
  });

  if (list.isLoading || !list.data || list.data.length === 0) return null;

  return (
    <section className="mt-10">
      <header className="mb-3">
        <h2 className="text-lg font-semibold">Polecane dla Ciebie</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Bazując na kursach, które już znasz (lub kursach najwyżej ocenianych, gdy zaczynasz).
        </p>
      </header>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.data.map((c) => (
          <li key={c.id}>
            <Link
              to={`/courses/${c.slug}`}
              className="block border rounded-lg bg-white p-4 hover:shadow-md transition h-full"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">{c.language}</p>
              <h3 className="font-semibold mt-1">{c.title}</h3>
              {c.reviewCount > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ★ {c.averageRating.toFixed(1)} <span className="text-gray-500">({c.reviewCount})</span>
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{c.description}</p>
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
