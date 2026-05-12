import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CardSkeleton } from '@/components/Skeleton';
import RecommendedCourses from '@/components/RecommendedCourses';

export default function MyCourses() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['me', 'courses'],
    queryFn: () => api.myCourses(),
  });

  return (
    <section className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Moje kursy</h1>

      {error && <p className="text-red-600">Nie udało się pobrać.</p>}

      <div className="space-y-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        {data?.map((c) => (
          <article key={c.id} className="border rounded-lg bg-white p-4">
            <div className="flex items-baseline justify-between gap-3">
              <Link to={`/courses/${c.slug}`} className="font-semibold hover:underline">
                {c.title}
              </Link>
              <span className="text-xs text-gray-500">{c.language}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">{c.description}</p>
            <div className="mt-3">
              <div className="h-2 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, c.progressPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>
                  {c.lessonsCompleted} / {c.lessonsTotal} lekcji
                </span>
                <span>{Math.round(c.progressPercent)}%</span>
              </div>
            </div>
            {c.nextLessonId ? (
              <div className="mt-3">
                <Link
                  to={`/courses/${c.slug}/lessons/${c.nextLessonId}`}
                  className="text-sm px-3 py-1.5 bg-black text-white rounded-md inline-block"
                >
                  {c.lessonsCompleted === 0 ? 'Zacznij' : 'Kontynuuj'}
                </Link>
              </div>
            ) : (
              <p className="text-xs text-green-700 mt-3">✓ ukończony</p>
            )}
          </article>
        ))}
        {data && data.length === 0 && (
          <p className="text-gray-500">
            Nie masz jeszcze żadnych kursów.{' '}
            <Link to="/courses" className="underline">
              Przeglądaj katalog
            </Link>
            .
          </p>
        )}
      </div>

      <RecommendedCourses />
    </section>
  );
}
