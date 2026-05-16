import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Sparkles,
  FileText,
  Wallet,
  BarChart3,
  Edit3,
  BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import Seo from '@/components/Seo';

const VISIBILITY_BADGE: Record<string, string> = {
  Public: 'badge-emerald',
  Draft: 'badge-neutral',
  Private: 'badge-neutral',
  PendingReview: 'badge-amber',
  Archived: 'badge-neutral',
};

export default function AuthorDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['author', 'courses'],
    queryFn: () => api.author.listMyCourses(),
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Panel autora" />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Panel autora</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Twoje kursy, analityka, wypłaty.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/author/payouts" className="btn-ghost">
            <Wallet className="w-4 h-4" />
            Wypłaty
          </Link>
          <Link to="/author/generate" className="btn-secondary">
            <FileText className="w-4 h-4" />
            Lekcja z AI
          </Link>
          <Link to="/author/generate-course" className="btn-secondary">
            <Sparkles className="w-4 h-4" />
            Cały kurs z AI
          </Link>
          <Link to="/author/courses/new" className="btn-brand">
            <Plus className="w-4 h-4" />
            Nowy kurs
          </Link>
        </div>
      </div>

      {error && (
        <div className="card p-6 text-center text-rose-600">Nie udało się pobrać Twoich kursów.</div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {data?.map((c) => (
          <article key={c.id} className="card-hover p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-brand-800 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold tracking-tight truncate">{c.title}</h2>
                <span className={VISIBILITY_BADGE[c.visibility] ?? 'badge-neutral'}>
                  {c.visibility}
                </span>
              </div>
              <p className="text-xs text-zinc-500">{c.language}</p>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to={`/author/courses/${c.id}/analytics`}
                className="btn-ghost !p-2"
                title="Analityka"
              >
                <BarChart3 className="w-4 h-4" />
              </Link>
              <Link to={`/author/courses/${c.id}`} className="btn-secondary">
                <Edit3 className="w-4 h-4" />
                Edytuj
              </Link>
            </div>
          </article>
        ))}
        {data && data.length === 0 && (
          <div className="card p-12 text-center">
            <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 mb-4">Nie masz jeszcze kursów.</p>
            <Link to="/author/courses/new" className="btn-brand inline-flex">
              <Plus className="w-4 h-4" />
              Stwórz pierwszy kurs
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
