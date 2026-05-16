import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  CheckCircle2,
  Lock,
  PlayCircle,
  BookOpen,
  HelpCircle,
  Video,
  Code2,
  User as UserIcon,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';
import CourseReviews from '@/components/CourseReviews';
import Seo from '@/components/Seo';

const LESSON_ICON = {
  Quiz: HelpCircle,
  Video: Video,
  Exercise: Code2,
  Theory: BookOpen,
} as const;

const LESSON_LABEL = {
  Quiz: 'quiz',
  Video: 'wideo',
  Exercise: 'zadanie',
  Theory: 'teoria',
} as const;

export default function CourseDetail() {
  const { slug = '' } = useParams();
  const auth = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => api.getCourse(slug),
  });

  const enroll = useMutation({
    mutationFn: () => api.enrollById(course!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course', slug] }),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) {
        toast.error('Ten kurs wymaga subskrypcji Pro.');
        navigate('/pricing');
      } else {
        toast.error(err instanceof Error ? err.message : 'Coś poszło nie tak.');
      }
    },
  });

  const favorite = useMutation({
    mutationFn: () => api.toggleFavorite(course!.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['course', slug] });
      qc.invalidateQueries({ queryKey: ['favorites', 'mine'] });
      toast.success(res.favorited ? 'Dodano do ulubionych' : 'Usunięto z ulubionych');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Błąd.'),
  });

  if (isLoading) {
    return (
      <div className="container-page py-10 space-y-4">
        <div className="h-8 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }
  if (error || !course) {
    return (
      <div className="container-narrow py-20 text-center">
        <p className="text-rose-600">Nie znaleziono kursu.</p>
        <Link to="/courses" className="btn-secondary mt-4">Wróć do katalogu</Link>
      </div>
    );
  }

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completed = course.modules.reduce((acc, m) => acc + m.lessons.filter((l) => l.isCompleted).length, 0);
  const progress = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);

  return (
    <section className="container-page py-10 lg:py-12">
      <Seo title={course.title} description={course.description} path={`/courses/${course.slug}`} type="article" />

      {course.visibility !== 'Public' && (
        <div className="card border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 mb-6 flex items-start gap-2 text-sm">
          <Lock className="w-4 h-4 mt-0.5 text-amber-700 dark:text-amber-300 shrink-0" />
          <span className="text-amber-900 dark:text-amber-200">
            <strong>Preview</strong> — kurs ze statusem <code className="font-mono">{course.visibility}</code>; widzisz go bo jesteś autorem (lub Adminem).
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MAIN */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-brand">{course.language}</span>
              {course.priceMonthlyPln ? (
                <span className="badge-amber">Pro</span>
              ) : (
                <span className="badge-emerald">darmowe</span>
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight">{course.title}</h1>
            <Link
              to={`/authors/${course.authorId}`}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 mt-3 hover:text-brand-600"
            >
              <UserIcon className="w-3.5 h-3.5" />
              {course.authorDisplayName}
            </Link>
            <p className="text-zinc-700 dark:text-zinc-300 mt-4 leading-relaxed">{course.description}</p>
            {course.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {course.tags.map((t) => (
                  <Link
                    key={t}
                    to={`/courses?tag=${encodeURIComponent(t)}`}
                    className="badge-neutral hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* CURRICULUM */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight mb-4">
              Plan kursu · {totalLessons} {totalLessons === 1 ? 'lekcja' : 'lekcji'}
            </h2>
            <div className="space-y-3">
              {course.modules.map((m) => (
                <div key={m.id} className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <h3 className="font-semibold tracking-tight">
                      <span className="text-zinc-400 font-mono mr-2">{String(m.order).padStart(2, '0')}</span>
                      {m.title}
                    </h3>
                  </div>
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {m.lessons.map((l) => {
                      const Icon = LESSON_ICON[l.type] ?? BookOpen;
                      return (
                        <li key={l.id}>
                          <Link
                            to={`/courses/${slug}/lessons/${l.id}`}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                          >
                            <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                              l.isCompleted
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}>
                              {l.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                            </span>
                            <span className="flex-1 text-sm group-hover:text-brand-600 transition-colors">
                              <span className="text-zinc-400 mr-1.5">{l.order}.</span>
                              {l.title}
                            </span>
                            <span className="text-xs text-zinc-400">{LESSON_LABEL[l.type]}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <CourseReviews courseId={course.id} isEnrolled={course.isEnrolled} />
        </div>

        {/* SIDEBAR (sticky on desktop) */}
        <aside className="lg:sticky lg:top-20 self-start">
          <div className="card p-6 space-y-4">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  {course.priceMonthlyPln ? `${course.priceMonthlyPln} zł` : 'Darmowe'}
                </span>
                {course.priceMonthlyPln && (
                  <span className="text-sm text-zinc-500">/ mies</span>
                )}
              </div>
              {course.priceMonthlyPln && (
                <p className="text-xs text-zinc-500 mt-1">w ramach subskrypcji Pro</p>
              )}
            </div>

            {course.isEnrolled && totalLessons > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>Postęp</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{progress}%</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {completed} z {totalLessons} lekcji
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              {auth.isAuthenticated() ? (
                course.isEnrolled ? (
                  <Link
                    to={`/courses/${slug}/lessons/${course.modules[0]?.lessons[0]?.id ?? ''}`}
                    className="btn-brand w-full !py-3"
                  >
                    <PlayCircle className="w-5 h-5" />
                    {completed > 0 ? 'Kontynuuj' : 'Zacznij naukę'}
                  </Link>
                ) : (
                  <button
                    className="btn-brand w-full !py-3"
                    onClick={() => enroll.mutate()}
                    disabled={enroll.isPending}
                  >
                    {enroll.isPending ? 'Zapisuję…' : 'Zapisz się'}
                  </button>
                )
              ) : (
                <Link
                  to="/login"
                  state={{ from: `/courses/${slug}` }}
                  className="btn-brand w-full !py-3"
                >
                  Zaloguj się, aby zapisać
                </Link>
              )}

              {auth.isAuthenticated() && (
                <button
                  onClick={() => favorite.mutate()}
                  disabled={favorite.isPending}
                  className={`btn-secondary w-full ${course.isFavorited ? '!text-rose-600 !border-rose-200 dark:!border-rose-900' : ''}`}
                >
                  <Heart className={`w-4 h-4 ${course.isFavorited ? 'fill-rose-500' : ''}`} />
                  {course.isFavorited ? 'W ulubionych' : 'Dodaj do ulubionych'}
                </button>
              )}
            </div>

            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {totalLessons} {totalLessons === 1 ? 'lekcja' : 'lekcji'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                AI mentor po polsku
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Certyfikat po ukończeniu
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Dostęp na zawsze
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
