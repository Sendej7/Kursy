import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type CourseLanguage } from '@/lib/api';

const LANGUAGES: (CourseLanguage | 'all')[] = ['all', 'Python', 'JavaScript', 'TypeScript', 'CSharp', 'Sql'];

export default function CourseCatalog() {
  const [q, setQ] = useState('');
  const [language, setLanguage] = useState<CourseLanguage | 'all'>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses', q, language],
    queryFn: () =>
      api.listCourses({
        q: q.trim() || undefined,
        language: language === 'all' ? undefined : language,
      }),
  });

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Katalog kursów</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="search"
          placeholder="Szukaj kursu…"
          className="flex-1 border rounded-md px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value as CourseLanguage | 'all')}
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l === 'all' ? 'Wszystkie języki' : l}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Ładowanie…</p>}
      {error && <p className="text-red-600">Nie udało się pobrać kursów.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((c) => (
          <Link
            key={c.id}
            to={`/courses/${c.slug}`}
            className="border rounded-lg p-4 bg-white hover:shadow-md transition"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">{c.language}</p>
            <h2 className="font-semibold text-lg mt-1">{c.title}</h2>
            <p className="text-sm text-gray-600 mt-1 line-clamp-3">{c.description}</p>
            <p className="mt-3 text-xs text-gray-500">
              {c.priceMonthlyPln ? `${c.priceMonthlyPln} zł/mies` : 'darmowe'}
            </p>
          </Link>
        ))}
        {data && data.length === 0 && (
          <p className="text-gray-500 col-span-full">Brak kursów pasujących do wyszukiwania.</p>
        )}
      </div>
    </section>
  );
}
