import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Star, BookOpen, Tag as TagIcon } from 'lucide-react';
import { api, type CourseLanguage } from '@/lib/api';
import { CardSkeleton } from '@/components/Skeleton';
import Seo from '@/components/Seo';

const LANGUAGES: (CourseLanguage | 'all')[] = ['all', 'Python', 'JavaScript', 'TypeScript', 'CSharp', 'Sql'];

const LANG_COLORS: Record<string, string> = {
  Python: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  JavaScript: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  TypeScript: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  CSharp: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  Sql: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

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
    <section className="container-page py-10 lg:py-16">
      <Seo
        title="Katalog kursów"
        description="Przeglądaj publiczne kursy programowania na Kursy.pl — Python, JavaScript, TypeScript."
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Katalog kursów</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {data?.length ?? '...'} {(data?.length ?? 0) === 1 ? 'kurs' : 'kursów'} do odkrycia
          </p>
        </div>
      </div>

      <div className="card p-4 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="search"
              placeholder="Szukaj kursu…"
              className="input pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-48"
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
          <div className="flex flex-wrap gap-2">
            <button
              className={`badge ${tag === null ? 'badge-brand' : 'badge-neutral hover:bg-zinc-200 dark:hover:bg-zinc-700'} transition-colors`}
              onClick={() => setTag(null)}
            >
              <TagIcon className="w-3 h-3" />
              wszystkie
            </button>
            {tags.data.map((t) => (
              <button
                key={t.tag}
                className={`badge ${tag === t.tag ? 'badge-brand' : 'badge-neutral hover:bg-zinc-200 dark:hover:bg-zinc-700'} transition-colors`}
                onClick={() => setTag(tag === t.tag ? null : t.tag)}
              >
                #{t.tag}
                <span className="opacity-60">{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="card p-6 text-center text-rose-600">
          Nie udało się pobrać kursów.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        {data?.map((c) => (
          <Link
            key={c.id}
            to={`/courses/${c.slug}`}
            className="card-hover p-6 flex flex-col group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`badge ${LANG_COLORS[c.language] ?? 'badge-neutral'}`}>
                {c.language}
              </span>
              {c.reviewCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {c.averageRating.toFixed(1)}
                  <span className="text-zinc-500">({c.reviewCount})</span>
                </span>
              )}
            </div>

            <h2 className="font-semibold text-lg tracking-tight group-hover:text-brand-600 transition-colors line-clamp-2">
              {c.title}
            </h2>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-3 flex-1 leading-relaxed">
              {c.description}
            </p>

            {c.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4">
                {c.tags.slice(0, 4).map((t) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-medium">
                {c.priceMonthlyPln ? (
                  <span className="text-brand-600">{c.priceMonthlyPln} zł / mies</span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    darmowe
                  </span>
                )}
              </span>
              <span className="text-xs text-zinc-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all">
                Zobacz →
              </span>
            </div>
          </Link>
        ))}
        {data && data.length === 0 && (
          <div className="col-span-full card p-12 text-center">
            <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500">Brak kursów pasujących do wyszukiwania.</p>
          </div>
        )}
      </div>
    </section>
  );
}
