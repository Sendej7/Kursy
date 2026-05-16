import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import Seo from '@/components/Seo';

export default function PendingCourses() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: () => api.admin.pendingCourses(),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.admin.approveCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
      toast.success('Kurs zatwierdzony — widoczny publicznie');
    },
  });
  const reject = useMutation({
    mutationFn: (id: string) => api.admin.rejectCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pending'] });
      toast.success('Kurs odrzucony — wrócił do draftu');
    },
  });

  return (
    <section className="container-page py-10 lg:py-16">
      <Seo title="Kursy do recenzji — admin" />

      <div className="mb-6 flex items-center gap-3">
        <span className="badge-amber">
          <Clock className="w-3 h-3" />
          Do recenzji
        </span>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Kursy oczekujące</h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {data?.map((c) => (
          <article key={c.id} className="card p-5 flex items-center gap-4">
            <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold tracking-tight truncate">{c.title}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {c.authorName} · {c.authorEmail}
              </p>
              <p className="text-xs text-zinc-500">
                {c.modules} {c.modules === 1 ? 'moduł' : 'modułów'} · {c.lessons} {c.lessons === 1 ? 'lekcja' : 'lekcji'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-brand bg-emerald-600 hover:bg-emerald-700 text-sm"
                onClick={() => approve.mutate(c.id)}
                disabled={approve.isPending}
              >
                <CheckCircle2 className="w-4 h-4" />
                Zatwierdź
              </button>
              <button
                className="btn-secondary text-sm"
                onClick={() => reject.mutate(c.id)}
                disabled={reject.isPending}
              >
                <XCircle className="w-4 h-4" />
                Odrzuć
              </button>
            </div>
          </article>
        ))}
        {data && data.length === 0 && (
          <div className="card p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-zinc-500">Pusto — wszystko zrecenzowane. 🎉</p>
          </div>
        )}
      </div>
    </section>
  );
}
