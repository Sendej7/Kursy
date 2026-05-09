import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function PendingCourses() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: () => api.admin.pendingCourses(),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.admin.approveCourse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pending'] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) => api.admin.rejectCourse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pending'] }),
  });

  return (
    <section className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Kursy oczekujące na recenzję</h1>
      {isLoading && <p className="text-gray-500">Ładowanie…</p>}
      <ul className="space-y-3">
        {data?.map((c) => (
          <li key={c.id} className="border rounded-lg bg-white p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{c.title}</h2>
              <p className="text-xs text-gray-500">
                {c.authorName} · {c.authorEmail} · {c.modules} modułów · {c.lessons} lekcji
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 bg-black text-white rounded-md text-sm"
                onClick={() => approve.mutate(c.id)}
              >
                Zatwierdź
              </button>
              <button
                className="px-3 py-1 border rounded-md text-sm"
                onClick={() => reject.mutate(c.id)}
              >
                Odrzuć
              </button>
            </div>
          </li>
        ))}
        {data && data.length === 0 && <p className="text-gray-500">Pusto. Wszystko zrecenzowane.</p>}
      </ul>
    </section>
  );
}
