import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function AuthorDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['author', 'courses'],
    queryFn: () => api.author.listMyCourses(),
  });

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Twoje kursy</h1>
        <div className="flex gap-2">
          <Link
            to="/author/generate-course"
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
          >
            Wygeneruj cały kurs z notatek
          </Link>
          <Link
            to="/author/generate"
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
          >
            Pojedyncza lekcja
          </Link>
          <Link
            to="/author/payouts"
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
          >
            Wypłaty
          </Link>
          <Link
            to="/author/courses/new"
            className="px-3 py-1.5 bg-black text-white rounded-md text-sm font-medium"
          >
            Nowy kurs
          </Link>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Ładowanie…</p>}
      {error && <p className="text-red-600">Nie udało się pobrać Twoich kursów.</p>}

      <ul className="space-y-3">
        {data?.map((c) => (
          <li key={c.id} className="border rounded-lg bg-white p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{c.title}</h2>
              <p className="text-xs text-gray-500">
                {c.language} · {c.visibility}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/author/courses/${c.id}`} className="text-sm underline">
                Edytuj
              </Link>
              <Link to={`/author/courses/${c.id}/analytics`} className="text-sm underline">
                Analityka
              </Link>
            </div>
          </li>
        ))}
        {data && data.length === 0 && (
          <p className="text-gray-500">Nie masz jeszcze kursów. Stwórz pierwszy.</p>
        )}
      </ul>
    </section>
  );
}
