import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function CourseCatalog() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: api.listCourses,
  });

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Katalog kursów</h1>

      {isLoading && <p className="text-gray-500">Ładowanie…</p>}
      {error && <p className="text-red-600">Nie udało się pobrać kursów.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((c) => (
          <article key={c.id} className="border rounded-lg p-4 bg-white">
            <h2 className="font-semibold text-lg">{c.title}</h2>
            <p className="text-sm text-gray-600 mt-1 line-clamp-3">{c.description}</p>
            <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
              <span>{c.language}</span>
              <span>{c.priceMonthlyPln ? `${c.priceMonthlyPln} zł/mies` : 'darmowe'}</span>
            </div>
          </article>
        ))}
        {data && data.length === 0 && (
          <p className="text-gray-500 col-span-full">Brak publicznych kursów. Wróć później.</p>
        )}
      </div>
    </section>
  );
}
