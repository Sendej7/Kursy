import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type CourseLanguage } from '@/lib/api';
import { CardSkeleton } from '@/components/Skeleton';
import Seo from '@/components/Seo';

const LANGUAGES: (CourseLanguage | 'all')[] = ['all', 'Python', 'JavaScript', 'TypeScript', 'CSharp', 'Sql'];

export default function CourseCatalog() {
  const [q, setQ] = useState('');
  const [language, setLanguage] = useState<CourseLanguage | 'all'>('all');
  const [tag, setTag] = useState<string | null>(null);

  const tags = useQuery({ queryKey: ['courses', 'tags'], queryFn: () => api.listCourseTags() });

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses', q, language, tag],
    queryFn: () =>
      api.listCourses({
        q: q.trim() || undefined,
        language: language === 'all' ? undefined : language,
        tag: tag ?? undefined,
      }),
  });

  return (
    <section className="max-w-5xl mx-auto px-4 py-10">
      <Seo
        title="Katalog kursów"
        description="Przeglądaj publiczne kursy programowania na Kursy.pl — Python, JavaScript, TypeScript."
      />
      <h1 className="text-2xl font-bold mb-6">Katalog kursów</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
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

      {tags.data && tags.data.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            className={`text-xs px-2 py-1 rounded-full border ${
              tag === null ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'
            }`}
            onClick={() => setTag(null)}
          >
            wszystkie tagi
          </button>
          {tags.data.map((t) => (
            <button
              key={t.tag}
              className={`text-xs px-2 py-1 rounded-full border ${
                tag === t.tag ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => setTag(tag === t.tag ? null : t.tag)}
            >
              #{t.tag} <span className="text-gray-400">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-600">Nie udało się pobrać kursów.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        {data?.map((c) => (
          <Link
            key={c.id}
            to={`/courses/${c.slug}`}
            className="border rounded-lg p-4 bg-white hover:shadow-md transition flex flex-col"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">{c.language}</p>
            <h2 className="font-semibold text-lg mt-1">{c.title}</h2>
            {c.reviewCount > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ★ {c.averageRating.toFixed(1)} <span className="text-gray-500">({c.reviewCount})</span>
              </p>
            )}
            <p className="text-sm text-gray-600 mt-1 line-clamp-3 flex-1">{c.description}</p>
            {c.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {c.tags.map((t) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                    #{t}
                  </span>
                ))}
              </div>
            )}
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
