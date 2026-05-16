import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlayCircle, CheckCircle2, BookOpen, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { CardSkeleton } from '@/components/Skeleton';
import RecommendedCourses from '@/components/RecommendedCourses';
import Seo from '@/components/Seo';

export default function MyCourses() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['me', 'courses'],
    queryFn: () => api.myCourses(),
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Moje kursy" />

      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Moje kursy</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Kontynuuj tam, gdzie skończyłeś.
        </p>
      </div>

      {error && (
        <div className="card p-6 text-center text-rose-600">Nie udało się pobrać kursów.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        {data?.map((c) => (
          <article key={c.id} className="card-hover p-6 flex flex-col group">
            <div className="flex items-start justify-between gap-3 mb-2">
              <Link
                to={`/courses/${c.slug}`}
                className="font-semibold text-lg tracking-tight group-hover:text-brand-600 transition-colors line-clamp-2"
              >
                {c.title}
              </Link>
              <span className="badge-neutral shrink-0">{c.language}</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 flex-1">
              {c.description}
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-zinc-500">
                  {c.lessonsCompleted} z {c.lessonsTotal} lekcji
                </span>
                <span className="font-medium">{Math.round(c.progressPercent)}%</span>
              </div>
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, c.progressPercent)}%` }}
                />
              </div>
            </div>

            <div className="mt-4">
              {c.nextLessonId ? (
                <Link
                  to={`/courses/${c.slug}/lessons/${c.nextLessonId}`}
                  className="btn-brand w-full"
                >
                  <PlayCircle className="w-4 h-4" />
                  {c.lessonsCompleted === 0 ? 'Zacznij naukę' : 'Kontynuuj'}
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Kurs ukończony 🎉
                </div>
              )}
            </div>
          </article>
        ))}
        {data && data.length === 0 && (
          <div className="md:col-span-2 card p-12 text-center">
            <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 mb-4">Nie masz jeszcze żadnych kursów.</p>
            <Link to="/courses" className="btn-brand inline-flex">
              Przeglądaj katalog
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      <div className="mt-16">
        <RecommendedCourses />
      </div>
    </section>
  );
}
