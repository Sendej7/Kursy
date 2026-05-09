import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function CourseDetail() {
  const { slug = '' } = useParams();
  const auth = useAuth();
  const qc = useQueryClient();

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => api.getCourse(slug),
  });

  const enroll = useMutation({
    mutationFn: () => api.enrollById(course!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', slug] }),
  });

  if (isLoading) return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Ładowanie…</p>;
  if (error || !course) {
    return <p className="max-w-3xl mx-auto px-4 py-10 text-red-600">Nie znaleziono kursu.</p>;
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{course.language}</p>
        <h1 className="text-3xl font-bold mt-1">{course.title}</h1>
        <p className="text-gray-700 mt-2">{course.description}</p>
        <div className="flex items-center gap-3 mt-4">
          {auth.isAuthenticated() ? (
            course.isEnrolled ? (
              <span className="text-sm text-green-700">✓ jesteś zapisany</span>
            ) : (
              <button
                className="px-3 py-1.5 bg-black text-white rounded-md text-sm font-medium disabled:opacity-50"
                onClick={() => enroll.mutate()}
                disabled={enroll.isPending}
              >
                Zapisz się
              </button>
            )
          ) : (
            <Link
              to="/login"
              state={{ from: `/courses/${slug}` }}
              className="px-3 py-1.5 bg-black text-white rounded-md text-sm font-medium"
            >
              Zaloguj się, aby zapisać
            </Link>
          )}
          <span className="text-sm text-gray-500">
            {course.priceMonthlyPln ? `${course.priceMonthlyPln} zł/mies` : 'darmowe'}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {course.modules.map((m) => (
          <div key={m.id} className="border rounded-lg bg-white">
            <div className="px-4 py-3 border-b">
              <h2 className="font-semibold">
                {m.order}. {m.title}
              </h2>
            </div>
            <ul className="divide-y">
              {m.lessons.map((l) => (
                <li key={l.id} className="px-4 py-2 flex items-center justify-between">
                  <Link
                    to={`/courses/${slug}/lessons/${l.id}`}
                    className="text-sm hover:underline"
                  >
                    <span className={l.isCompleted ? 'text-green-700' : ''}>
                      {l.isCompleted ? '✓ ' : ''}
                      {l.order}. {l.title}
                    </span>
                  </Link>
                  <span className="text-xs text-gray-400">{l.type}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
